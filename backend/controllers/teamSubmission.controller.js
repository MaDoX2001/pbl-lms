const TeamSubmission = require('../models/TeamSubmission.model');
const Team = require('../models/Team.model');
const Project = require('../models/Project.model');
const TeamProject = require('../models/TeamProject.model');
const cloudinary = require('../services/cloudinary.service');
const multer = require('multer');

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

// @desc    Submit a file for a project
// @route   POST /api/team-submissions
// @access  Private (team members only)
exports.createSubmission = async (req, res) => {
  try {
    const { teamId, projectId, description } = req.body;

    // Validate inputs
    if (!teamId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفريق والمشروع مطلوبان'
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

    // Access control: Only team members can submit
    const isMember = team.members.some(
      member => member.toString() === req.user._id.toString()
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
      fileUrl: uploadResult.secure_url,
      fileName: req.file.originalname,
      description,
      submittedBy: req.user._id
    });

    await submission.populate([
      { path: 'team', populate: { path: 'members', select: 'name email' } },
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
        member => member.toString() === req.user._id.toString()
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

    const submissions = await TeamSubmission.find({ project: projectId })
      .populate({
        path: 'team',
        populate: { path: 'members', select: 'name email' }
      })
      .populate('submittedBy', 'name email')
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
        populate: { path: 'members', select: 'name email' }
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
        member => member._id.toString() === req.user._id.toString()
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

    const submission = await TeamSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    submission.feedback = feedback;
    submission.feedbackBy = req.user._id;
    submission.feedbackAt = new Date();
    submission.status = 'reviewed';

    await submission.save();
    await submission.populate([
      { path: 'team', populate: { path: 'members', select: 'name email' } },
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

    const submission = await TeamSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    submission.score = score;
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();
    await submission.populate([
      { path: 'team', populate: { path: 'members', select: 'name email' } },
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
