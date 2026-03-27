const Progress = require('../models/Progress.model');
const Project = require('../models/Project.model');
const User = require('../models/User.model');
const cloudinaryService = require('../services/cloudinary.service');

// @desc    Get student progress for a project
// @route   GET /api/progress/:projectId
// @access  Private
exports.getProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({
      student: req.user.id,
      project: req.params.projectId
    }).populate('project', 'title milestones points');
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على تقدم لهذا المشروع'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...progress.toObject(),
        completionPercentage: progress.getCompletionPercentage()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقدم',
      error: error.message
    });
  }
};

// @desc    Get all progress for a student
// @route   GET /api/progress/student/:studentId
// @access  Private
exports.getStudentProgress = async (req, res) => {
  try {
    // Handle "me" keyword - use authenticated user's ID
    const studentId = req.params.studentId === 'me' ? req.user.id : req.params.studentId;
    
    // Check authorization
    if (studentId !== req.user.id && req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذه البيانات'
      });
    }
    
    const progressList = await Progress.find({ student: studentId })
      .populate('project', 'title difficulty category points coverImage')
      .sort({ lastActivityAt: -1 });
    
    // Add completion percentage to each progress
    const progressWithStats = progressList.map(p => ({
      ...p.toObject(),
      completionPercentage: p.getCompletionPercentage()
    }));
    
    res.json({
      success: true,
      count: progressList.length,
      data: progressWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقدم',
      error: error.message
    });
  }
};

// @desc    Update milestone progress
// @route   PUT /api/progress/:projectId/milestone/:milestoneId
// @access  Private (Student)
exports.updateMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { completed } = req.body;
    
    const progress = await Progress.findOne({
      student: req.user.id,
      project: projectId
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على تقدم لهذا المشروع'
      });
    }
    
    // Find and update milestone
    const milestoneProgress = progress.milestoneProgress.find(
      m => m.milestoneId.toString() === milestoneId
    );
    
    if (!milestoneProgress) {
      return res.status(404).json({
        success: false,
        message: 'المرحلة غير موجودة'
      });
    }
    
    milestoneProgress.completed = completed;
    if (completed) {
      milestoneProgress.completedAt = new Date();
    }
    
    await progress.save();
    
    res.json({
      success: true,
      message: 'تم تحديث المرحلة بنجاح',
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المرحلة',
      error: error.message
    });
  }
};

// @desc    Submit project
// @route   POST /api/progress/:projectId/submit
// @access  Private (Student)
exports.submitProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { submissionUrl, codeSubmission, demoUrl, notes } = req.body;
    const wiringImageFile = req.files?.wiringImage?.[0];
    const extraSubmissionFile = req.files?.submissionFile?.[0];

    if (!submissionUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'رابط التسليم إجباري' });
    }

    if (!codeSubmission?.trim()) {
      return res.status(400).json({ success: false, message: 'الكود إجباري' });
    }

    if (!wiringImageFile) {
      return res.status(400).json({ success: false, message: 'صورة التوصيل إجبارية' });
    }

    if (!String(wiringImageFile.mimetype || '').startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'صورة التوصيل يجب أن تكون صورة' });
    }
    
    const progress = await Progress.findOne({
      student: req.user.id,
      project: projectId
    });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على تقدم لهذا المشروع'
      });
    }

    const previousAttemptsCount = progress.submissionHistory?.length || progress.attempts || 0;
    if (previousAttemptsCount > 0 && !progress.resubmissionAllowed) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إعادة التسليم الآن. بانتظار موافقة المراجع على فتح إعادة التسليم.'
      });
    }
    
    // Update progress
    progress.status = 'submitted';
    progress.submittedAt = new Date();
    progress.submissionUrl = submissionUrl;
    progress.codeSubmission = codeSubmission;
    progress.demoUrl = demoUrl;
    progress.notes = notes;
    progress.attempts = previousAttemptsCount + 1;
    progress.resubmissionAllowed = false;

    const wiringFolder = `pbl-lms/wiring-images/project-${projectId}/student-${req.user.id}`;
    const wiringUploadResult = await cloudinaryService.uploadFile(
      wiringImageFile.buffer,
      wiringImageFile.originalname,
      wiringFolder
    );
    progress.wiringImageUrl = wiringUploadResult.url;
    progress.submissionFiles = [];

    if (extraSubmissionFile) {
      const folder = `pbl-lms/progress-submissions/project-${projectId}/student-${req.user.id}`;
      const uploadResult = await cloudinaryService.uploadFile(
        extraSubmissionFile.buffer,
        extraSubmissionFile.originalname,
        folder
      );

      progress.submissionFiles.push({
        filename: extraSubmissionFile.originalname,
        url: uploadResult.url,
        uploadedAt: new Date()
      });
    }

    progress.submissionHistory = progress.submissionHistory || [];
    progress.submissionHistory.push({
      attemptNumber: progress.attempts,
      submittedAt: progress.submittedAt,
      submissionUrl: progress.submissionUrl,
      codeSubmission: progress.codeSubmission,
      wiringImageUrl: progress.wiringImageUrl,
      demoUrl: progress.demoUrl,
      notes: progress.notes,
      submissionFiles: progress.submissionFiles || []
    });
    
    await progress.save();
    
    res.json({
      success: true,
      message: 'تم تسليم المشروع بنجاح',
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسليم المشروع',
      error: error.message
    });
  }
};

// @desc    Add reviewer feedback and optionally allow re-submission
// @route   PUT /api/progress/:progressId/feedback
// @access  Private (Teacher/Admin)
exports.addReviewerFeedback = async (req, res) => {
  try {
    const { progressId } = req.params;
    const { comments, allowResubmission } = req.body;

    const progress = await Progress.findById(progressId).populate('project student');
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'التسليم غير موجود'
      });
    }

    if (req.user.role !== 'admin' && progress.project?.instructor?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة تعليق على هذا التسليم'
      });
    }

    // Get the latest individual evaluation
    const latestIndividualEvaluation = await EvaluationAttempt.findOne({
      project: progress.project._id,
      student: progress.student._id,
      phase: 'individual_oral',
      isLatestAttempt: true
    });

    let scoreFromEvaluation = latestIndividualEvaluation?.calculatedScore ?? null;

    // For individual projects, the score is the average of both observation cards
    if (!progress.project?.isTeamProject) {
      const latestGroupEvaluation = await EvaluationAttempt.findOne({
        project: progress.project._id,
        student: progress.student._id,
        phase: 'group',
        isLatestAttempt: true
      });

      if (latestIndividualEvaluation && latestGroupEvaluation) {
        scoreFromEvaluation = Number((((latestIndividualEvaluation.calculatedScore + latestGroupEvaluation.calculatedScore) / 2)).toFixed(2));
      }
    }

    const reviewedAt = new Date();
    progress.feedback = {
      ...(progress.feedback || {}),
      reviewer: req.user.id,
      comments: comments || '',
      score: scoreFromEvaluation,
      reviewedAt
    };
    progress.status = 'reviewed';
    progress.resubmissionAllowed = Boolean(allowResubmission);

    progress.feedbackHistory = progress.feedbackHistory || [];
    progress.feedbackHistory.push({
      reviewer: req.user.id,
      score: scoreFromEvaluation,
      comments: comments || '',
      reviewedAt,
      allowResubmission: Boolean(allowResubmission)
    });

    if (progress.submissionHistory?.length > 0) {
      const latestAttempt = progress.submissionHistory[progress.submissionHistory.length - 1];
      latestAttempt.feedback = {
        reviewer: req.user.id,
        comments: comments || '',
        reviewedAt,
        allowResubmission: Boolean(allowResubmission)
      };
    }

    await progress.save();

    res.json({
      success: true,
      message: Boolean(allowResubmission)
        ? 'تم حفظ التعليق وفتح إعادة التسليم للطالب'
        : 'تم حفظ التعليق بنجاح',
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ تعليق المراجع',
      error: error.message
    });
  }
};

// @desc    Review and grade submission
// @route   PUT /api/progress/:progressId/review
// @access  Private (Teacher/Admin)
exports.reviewSubmission = async (req, res) => {
  try {
    const { progressId } = req.params;
    const { score, comments, strengths, improvements } = req.body;
    
    const progress = await Progress.findById(progressId).populate('project');
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'التقدم غير موجود'
      });
    }
    
    // Update feedback
    progress.feedback = {
      reviewer: req.user.id,
      score,
      comments,
      strengths,
      improvements,
      reviewedAt: new Date()
    };
    
    progress.status = 'reviewed';
    
    // Calculate points earned based on score
    const maxPoints = progress.project.points;
    progress.pointsEarned = Math.round((score / 100) * maxPoints);
    
    // If score is passing (e.g., >= 60), mark as completed
    if (score >= 60) {
      progress.status = 'completed';
      progress.completedAt = new Date();
      
      // Update user points and completed projects
      const user = await User.findById(progress.student);
      user.points += progress.pointsEarned;
      user.updateLevel();
      
      if (!user.completedProjects.includes(progress.project._id)) {
        user.completedProjects.push(progress.project._id);
      }
      
      await user.save();
      
      // Update project completed count
      const project = await Project.findById(progress.project._id);
      if (!project.completedBy.includes(progress.student)) {
        project.completedBy.push(progress.student);
        await project.save();
      }
    }
    
    await progress.save();
    
    res.json({
      success: true,
      message: 'تمت المراجعة بنجاح',
      data: progress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في مراجعة التسليم',
      error: error.message
    });
  }
};

// @desc    Get all submissions for a project (for teachers)
// @route   GET /api/progress/project/:projectId/submissions
// @access  Private (Teacher/Admin)
exports.getProjectSubmissions = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const submissions = await Progress.find({
      project: projectId,
      status: { $in: ['submitted', 'reviewed', 'completed'] }
    })
      .populate('student', 'name email avatar')
      .sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التسليمات',
      error: error.message
    });
  }
};
