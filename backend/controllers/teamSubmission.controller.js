const TeamSubmission = require('../models/TeamSubmission.model');
const Team = require('../models/Team.model');
const Project = require('../models/Project.model');
const TeamProject = require('../models/TeamProject.model');
const EvaluationAttempt = require('../models/EvaluationAttempt.model');
const cloudinary = require('../services/cloudinary.service');
const multer = require('multer');
const {
  STAGE_TO_REQUIRED_ROLE,
  FILE_ALLOWED_STAGES,
  WOKWI_ALLOWED_STAGES,
  STAGE_ORDER
} = require('../utils/stagedSubmissionConfig');

/**
 * TeamSubmission Controller
 * 
 * Handles team submissions for projects.
 * - Multiple submissions allowed per project
 * - Old submissions are NEVER overwritten
 * - Teachers/Admins can add feedback and grades
 */

// Multer configuration for file upload (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    // Allow all file types for now (as per requirements)
    cb(null, true);
  }
});

// Export upload middleware
exports.uploadMiddleware = upload.single('file');
exports.uploadWokwiFilesMiddleware = upload.array('attachments', 8);

const getTeamMemberIds = (team) => {
  return (team.members || []).map((member) => (member.user?._id || member.user || member).toString());
};

const getStudentRoleInProject = (enrollment, userId) => {
  const hit = (enrollment.memberRoles || []).find(
    (mr) => mr.user.toString() === userId.toString()
  );
  return hit ? hit.role : null;
};

const buildStageProgress = (submissions, teamMemberIds) => {
  const byStage = STAGE_ORDER.reduce((acc, key) => {
    acc[key] = submissions.filter((s) => s.stageKey === key);
    return acc;
  }, {});

  const programmingSubmitters = new Set(byStage.programming.map((s) => s.submittedBy.toString()));
  const programmingCompleted = teamMemberIds.every((id) => programmingSubmitters.has(id));

  return {
    completed: {
      design: byStage.design.length > 0,
      wiring: byStage.wiring.length > 0,
      programming: programmingCompleted,
      testing: byStage.testing.length > 0,
      final_delivery: byStage.final_delivery.length > 0
    },
    byStage,
    programmingSubmitters: Array.from(programmingSubmitters)
  };
};

const isStageUnlocked = (stageKey, completed) => {
  if (stageKey === 'design') return true;
  if (stageKey === 'wiring') return completed.design;
  if (stageKey === 'programming') return completed.wiring;
  if (stageKey === 'testing') return completed.programming;
  if (stageKey === 'final_delivery') return completed.testing;
  return false;
};

const canTeacherAccessProject = async (projectId, user) => {
  if (user.role === 'admin') return true;
  const project = await Project.findById(projectId).select('instructor');
  if (!project) return false;
  return project.instructor?.toString() === user._id.toString();
};

const enforceStagePermissions = ({ stageKey, enrollment, userId, completed }) => {
  if (!isStageUnlocked(stageKey, completed)) {
    return {
      allowed: false,
      status: 403,
      message: 'هذه المرحلة غير متاحة الآن. يجب إكمال المراحل السابقة أولاً.'
    };
  }

  const requiredRole = STAGE_TO_REQUIRED_ROLE[stageKey];
  if (!requiredRole) {
    return { allowed: true };
  }

  const studentRole = getStudentRoleInProject(enrollment, userId);
  if (studentRole !== requiredRole) {
    return {
      allowed: false,
      status: 403,
      message: 'غير مصرح لك بالتسليم في هذه المرحلة لأن الدور لا يطابق دورك في المشروع.'
    };
  }

  return { allowed: true };
};

const canSubmitAfterFinalDelivery = async (projectId, studentId) => {
  const retryAttempt = await EvaluationAttempt.findOne({
    project: projectId,
    student: studentId,
    isLatestAttempt: true,
    retryAllowed: true
  }).select('_id');

  return Boolean(retryAttempt);
};

const isTeacherReviewedVersion = (submission) => {
  if (!submission) return false;
  if (submission.status === 'reviewed' || submission.status === 'graded') return true;
  if (submission.feedback || submission.feedbackAt || submission.feedbackBy) return true;
  if (submission.score !== null && submission.score !== undefined) return true;
  if (submission.gradedAt || submission.gradedBy) return true;
  return false;
};

const pruneObsoleteWokwiVersions = async ({ teamId, projectId, stageKey }) => {
  if (!teamId || !projectId || !stageKey) return;

  const scoped = await TeamSubmission.find({
    team: teamId,
    project: projectId,
    submissionType: 'wokwi',
    stageKey,
  })
    .select('submittedBy submittedAt createdAt status feedback feedbackAt feedbackBy score gradedAt gradedBy')
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 });

  if (!scoped.length) return;

  const seenLatestByKey = new Set();
  const deletableIds = [];

  for (const item of scoped) {
    const groupingKey = stageKey === 'programming'
      ? `programming:${String(item.submittedBy || '')}`
      : stageKey;

    if (!seenLatestByKey.has(groupingKey)) {
      seenLatestByKey.add(groupingKey);
      continue;
    }

    if (!isTeacherReviewedVersion(item)) {
      deletableIds.push(item._id);
    }
  }

  if (deletableIds.length > 0) {
    await TeamSubmission.deleteMany({ _id: { $in: deletableIds } });
  }
};

// @desc    Submit a file for a project
// @route   POST /api/team-submissions
// @access  Private (team members only)
exports.createSubmission = async (req, res) => {
  try {
    const { teamId, projectId, description, stageKey } = req.body;

    // Validate inputs
    if (!teamId || !projectId || !stageKey) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفريق والمشروع والمرحلة مطلوبون'
      });
    }

    if (!FILE_ALLOWED_STAGES.has(stageKey)) {
      return res.status(400).json({
        success: false,
        message: 'تم توحيد تسليم المشروع الجماعي عبر Wokwi لكل المراحل. استخدم صفحة Wokwi للتسليم.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع ملف'
      });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(400).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    // STRICT DEADLINE ENFORCEMENT: Check if deadline has passed
    if (project.deadline) {
      const currentDate = new Date();
      const projectDeadline = new Date(project.deadline);
      
      if (currentDate > projectDeadline) {
        return res.status(403).json({
          success: false,
          message: 'انتهى موعد تسليم المشروع'
        });
      }
    }

    // Access control: Only team members can submit
    const isMember = team.members.some(
      member => (member.user?._id || member.user || member).toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'فقط أعضاء الفريق يمكنهم رفع التسليم'
      });
    }

    // Check if team is enrolled in project
    const enrollment = await TeamProject.findOne({
      team: teamId,
      project: projectId
    });
    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'الفريق غير مسجل في هذا المشروع'
      });
    }

    const existingSubmissions = await TeamSubmission.find({
      team: teamId,
      project: projectId
    }).select('stageKey submittedBy');

    const teamMemberIds = getTeamMemberIds(team);
    const stageProgress = buildStageProgress(existingSubmissions, teamMemberIds);
    const permission = enforceStagePermissions({
      stageKey,
      enrollment,
      userId: req.user._id,
      completed: stageProgress.completed
    });
    if (!permission.allowed) {
      return res.status(permission.status || 403).json({ success: false, message: permission.message });
    }

    // Once final delivery exists, students can only submit again when teacher/admin explicitly allows retry.
    if (stageProgress.completed.final_delivery) {
      const retryAllowed = await canSubmitAfterFinalDelivery(projectId, req.user._id);
      if (!retryAllowed) {
        return res.status(403).json({
          success: false,
          message: 'بعد التسليم النهائي لا يمكن إعادة التسليم إلا بعد سماح المعلم بإعادة المحاولة أثناء التقييم.'
        });
      }
    }

    // Upload to Cloudinary
    const folder = `pbl-lms/team-submissions/team-${teamId}`;
    const uploadResult = await cloudinary.uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder
    );

    // Create submission
    const submission = await TeamSubmission.create({
      team: teamId,
      project: projectId,
      stageKey,
      fileUrl: uploadResult.url,
      fileName: req.file.originalname,
      description,
      submittedBy: req.user._id
    });

    await submission.populate([
      { path: 'team', populate: { path: 'members.user', select: 'name email' } },
      { path: 'project', select: 'title description' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في رفع التسليم',
      error: error.message
    });
  }
};

// @desc    Get stage progress for a team's project
// @route   GET /api/team-submissions/progress/:teamId/:projectId
// @access  Private (team member, teacher, admin)
exports.getStageProgress = async (req, res) => {
  try {
    const { teamId, projectId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'الفريق غير موجود' });
    }

    if (req.user.role === 'student') {
      const isMember = team.members.some(
        (m) => (m.user?._id || m.user || m).toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك' });
      }
    }

    const enrollment = await TeamProject.findOne({ team: teamId, project: projectId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'الفريق غير مسجل في هذا المشروع' });
    }

    const submissions = await TeamSubmission.find({ team: teamId, project: projectId })
      .select('stageKey submittedBy submissionType submittedAt');
    const teamMemberIds = getTeamMemberIds(team);
    const progress = buildStageProgress(submissions, teamMemberIds);

    res.json({
      success: true,
      data: {
        completed: progress.completed,
        programmingRequiredCount: teamMemberIds.length,
        programmingSubmittedCount: progress.programmingSubmitters.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب حالة المراحل',
      error: error.message
    });
  }
};

// @desc    Get all submissions for a team's project
// @route   GET /api/team-submissions/team/:teamId/project/:projectId
// @access  Private (team members, teacher, admin)
exports.getTeamProjectSubmissions = async (req, res) => {
  try {
    const { teamId, projectId } = req.params;

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Access control: Students can only see their team's submissions
    if (req.user.role === 'student') {
      const isMember = team.members.some(
        member => (member.user?._id || member.user || member).toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض تسليمات هذا الفريق'
        });
      }
    }

    const submissions = await TeamSubmission.find({
      team: teamId,
      project: projectId
    })
      .populate('submittedBy', 'name email')
      .populate('handoffAcceptedBy', 'name email')
      .populate('feedbackBy', 'name')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب التسليمات',
      error: error.message
    });
  }
};

// @desc    Get all submissions for a project (all teams)
// @route   GET /api/team-submissions/project/:projectId
// @access  Teacher/Admin
exports.getProjectSubmissions = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض جميع التسليمات'
      });
    }

    const { projectId } = req.params;

    const canAccess = await canTeacherAccessProject(projectId, req.user);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض تسليمات هذا المشروع'
      });
    }

    const submissions = await TeamSubmission.find({ project: projectId })
      .populate({
        path: 'team',
        populate: { path: 'members.user', select: 'name email' }
      })
      .populate('submittedBy', 'name email')
      .populate('handoffAcceptedBy', 'name email')
      .populate('feedbackBy', 'name')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب التسليمات',
      error: error.message
    });
  }
};

// @desc    Get submission by ID
// @route   GET /api/team-submissions/:id
// @access  Private (team member, teacher, admin)
exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await TeamSubmission.findById(req.params.id)
      .populate({
        path: 'team',
        populate: { path: 'members.user', select: 'name email' }
      })
      .populate('project')
      .populate('submittedBy', 'name email')
      .populate('feedbackBy', 'name')
      .populate('gradedBy', 'name');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    // Access control: Students can only see their team's submission
    if (req.user.role === 'student') {
      const isMember = submission.team.members.some(
        member => (member.user?._id || member.user || member).toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض هذا التسليم'
        });
      }
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب التسليم',
      error: error.message
    });
  }
};

// @desc    Add/Update feedback for a submission
// @route   PUT /api/team-submissions/:id/feedback
// @access  Teacher/Admin
exports.addFeedback = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'فقط المعلم أو المدير يمكنه إضافة الملاحظات'
      });
    }

    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        success: false,
        message: 'الملاحظات مطلوبة'
      });
    }

    const submission = await TeamSubmission.findById(req.params.id).populate('project', 'instructor');
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    const canAccess = req.user.role === 'admin'
      || submission.project?.instructor?.toString() === req.user._id.toString();
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة ملاحظات على هذا التسليم'
      });
    }

    submission.feedback = feedback;
    submission.feedbackBy = req.user._id;
    submission.feedbackAt = new Date();
    submission.status = 'reviewed';

    await submission.save();
    await submission.populate([
      { path: 'team', populate: { path: 'members.user', select: 'name email' } },
      { path: 'feedbackBy', select: 'name' }
    ]);

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إضافة الملاحظات',
      error: error.message
    });
  }
};

// @desc    Add/Update grade for a submission
// @route   PUT /api/team-submissions/:id/grade
// @access  Teacher/Admin
exports.addGrade = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'فقط المعلم أو المدير يمكنه إضافة الدرجة'
      });
    }

    const { score } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        message: 'الدرجة مطلوبة'
      });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'الدرجة يجب أن تكون بين 0 و 100'
      });
    }

    const submission = await TeamSubmission.findById(req.params.id).populate('project', 'instructor');
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    const canAccess = req.user.role === 'admin'
      || submission.project?.instructor?.toString() === req.user._id.toString();
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة درجة على هذا التسليم'
      });
    }

    submission.score = score;
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();
    await submission.populate([
      { path: 'team', populate: { path: 'members.user', select: 'name email' } },
      { path: 'gradedBy', select: 'name' }
    ]);

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إضافة الدرجة',
      error: error.message
    });
  }
};

// @desc    Delete submission
// @route   DELETE /api/team-submissions/:id
// @access  Admin only
exports.deleteSubmission = async (req, res) => {
  try {
    // Validate: Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير يمكنه حذف التسليم'
      });
    }

    const submission = await TeamSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    await submission.deleteOne();

    res.json({
      success: true,
      message: 'تم حذف التسليم بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف التسليم',
      error: error.message
    });
  }
};

  // @desc    Submit a Wokwi simulator link for a project
  // @route   POST /api/team-submissions/wokwi
  // @access  Private (team members only)
  exports.submitWokwiLink = async (req, res) => {
    try {
      const { teamId, projectId, wokwiLink, notes, stageKey = 'wiring' } = req.body;
      const attachedFiles = Array.isArray(req.files) ? req.files : [];

      if (!teamId || !projectId || !wokwiLink) {
        return res.status(400).json({
          success: false,
          message: 'الفريق والمشروع ورابط Wokwi مطلوبون'
        });
      }

      if (!WOKWI_ALLOWED_STAGES.has(stageKey)) {
        return res.status(400).json({
          success: false,
          message: 'تسليم Wokwi مسموح فقط في مرحلة الموصل'
        });
      }

      // Validate Wokwi link format
      if (!/^https:\/\/wokwi\.com\/projects\/[a-zA-Z0-9_-]+/.test(wokwiLink)) {
        return res.status(400).json({
          success: false,
          message: 'رابط Wokwi غير صالح — يجب أن يكون بصيغة https://wokwi.com/projects/XXXXX'
        });
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: 'الفريق غير موجود' });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
      }

      // Deadline check
      if (project.deadline && new Date() > new Date(project.deadline)) {
        return res.status(403).json({ success: false, message: 'انتهى موعد تسليم المشروع' });
      }

      // Only team members can submit
      const isMember = team.members.some(
        m => (m.user?._id || m.user || m).toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'فقط أعضاء الفريق يمكنهم التسليم' });
      }

      // Check enrollment
      const enrollment = await TeamProject.findOne({ team: teamId, project: projectId });
      if (!enrollment) {
        return res.status(400).json({ success: false, message: 'الفريق غير مسجل في هذا المشروع' });
      }

      const existingSubmissions = await TeamSubmission.find({
        team: teamId,
        project: projectId
      }).select('stageKey submittedBy');

      const teamMemberIds = getTeamMemberIds(team);
      const stageProgress = buildStageProgress(existingSubmissions, teamMemberIds);
      const permission = enforceStagePermissions({
        stageKey,
        enrollment,
        userId: req.user._id,
        completed: stageProgress.completed
      });
      if (!permission.allowed) {
        return res.status(permission.status || 403).json({ success: false, message: permission.message });
      }

      // Once final delivery exists, students can only submit again when teacher/admin explicitly allows retry.
      if (stageProgress.completed.final_delivery) {
        const retryAllowed = await canSubmitAfterFinalDelivery(projectId, req.user._id);
        if (!retryAllowed) {
          return res.status(403).json({
            success: false,
            message: 'بعد التسليم النهائي لا يمكن إعادة التسليم إلا بعد سماح المعلم بإعادة المحاولة أثناء التقييم.'
          });
        }
      }

      const submission = await TeamSubmission.create({
        team: teamId,
        project: projectId,
        stageKey,
        submissionType: 'wokwi',
        wokwiLink,
        notes: notes || '',
        attachments: [],
        handoffAcceptedBy: null,
        handoffAcceptedAt: null,
        submittedBy: req.user._id
      });

      // Optional attachments upload (images, pdf, docs, etc.)
      if (attachedFiles.length > 0) {
        const folder = `pbl-lms/team-submissions/team-${teamId}/wokwi-attachments`;
        const uploadedAttachments = await Promise.all(
          attachedFiles.map(async (file) => {
            const uploaded = await cloudinary.uploadFile(file.buffer, file.originalname, folder);
            return {
              url: uploaded.url,
              publicId: uploaded.fileId,
              fileName: file.originalname,
              fileType: file.mimetype,
              fileSize: file.size
            };
          })
        );

        submission.attachments = uploadedAttachments;
        await submission.save();
      }

      // Retention policy:
      // - Keep only latest version per stage.
      // - For programming, keep latest version per student (typically 3 students).
      // - Keep any older version that already has teacher review/feedback/grade.
      await pruneObsoleteWokwiVersions({ teamId, projectId, stageKey });

      await submission.populate([
        { path: 'submittedBy', select: 'name email' },
        { path: 'handoffAcceptedBy', select: 'name email' },
        { path: 'project', select: 'title' }
      ]);

      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'حدث خطأ في تسليم الرابط',
        error: error.message
      });
    }
  };

  // @desc    Get latest Wokwi submissions for a team's project (history)
  // @route   GET /api/team-submissions/wokwi/:teamId/:projectId
  // @access  Private (team members, teacher, admin)
  exports.getWokwiHistory = async (req, res) => {
    try {
      const { teamId, projectId } = req.params;

      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: 'الفريق غير موجود' });
      }

      if (req.user.role === 'student') {
        const isMember = team.members.some(
          m => (m.user?._id || m.user || m).toString() === req.user._id.toString()
        );
        if (!isMember) {
          return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
      }

      const submissions = await TeamSubmission.find({
        team: teamId,
        project: projectId,
        submissionType: 'wokwi'
      })
        .populate('submittedBy', 'name email')
        .populate('handoffAcceptedBy', 'name email')
        .sort({ submittedAt: -1 })
        .limit(20);

      res.json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب السجل', error: error.message });
    }
  };

  // @desc    Get ONLY the latest Wokwi submission for a team's project
  // @route   GET /api/team-submissions/wokwi/:teamId/:projectId/latest
  // @access  Private
  exports.getLatestWokwiSubmission = async (req, res) => {
    try {
      const { teamId, projectId } = req.params;

      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, message: 'الفريق غير موجود' });
      }

      if (req.user.role === 'student') {
        const isMember = team.members.some(
          m => (m.user?._id || m.user || m).toString() === req.user._id.toString()
        );
        if (!isMember) {
          return res.status(403).json({ success: false, message: 'غير مصرح لك' });
        }
      }

      const submission = await TeamSubmission.findOne({
        team: teamId,
        project: projectId,
        submissionType: 'wokwi'
      })
        .populate('submittedBy', 'name email')
        .populate('handoffAcceptedBy', 'name email')
        .sort({ submittedAt: -1 });

      res.json({ success: true, data: submission || null });
    } catch (error) {
      res.status(500).json({ success: false, message: 'خطأ في جلب آخر نسخة', error: error.message });
    }
  };

// @desc    Acknowledge receiving a Wokwi handoff submission
// @route   PUT /api/team-submissions/:id/handoff-ack
// @access  Private (team members only)
exports.acknowledgeWokwiHandoff = async (req, res) => {
  try {
    const submission = await TeamSubmission.findById(req.params.id)
      .populate({ path: 'team', select: 'members' })
      .populate('handoffAcceptedBy', 'name email')
      .populate('submittedBy', 'name email');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'التسليم غير موجود' });
    }

    if (submission.submissionType !== 'wokwi') {
      return res.status(400).json({ success: false, message: 'تأكيد الاستلام متاح فقط لتسليمات Wokwi' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'هذه العملية مخصصة لأعضاء الفريق فقط' });
    }

    const isMember = (submission.team?.members || []).some(
      (m) => (m.user?._id || m.user || m).toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    if (submission.submittedBy && submission.submittedBy._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تأكيد استلام نسخة قمتَ أنت بتسليمها' });
    }

    submission.handoffAcceptedBy = req.user._id;
    submission.handoffAcceptedAt = new Date();
    await submission.save();
    await submission.populate('handoffAcceptedBy', 'name email');

    res.json({ success: true, data: submission, message: 'تم تأكيد استلام النسخة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تأكيد استلام النسخة', error: error.message });
  }
};
