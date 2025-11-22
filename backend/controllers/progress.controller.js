const Progress = require('../models/Progress.model');
const Project = require('../models/Project.model');
const User = require('../models/User.model');

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
    const studentId = req.params.studentId || req.user.id;
    
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
    
    // Update progress
    progress.status = 'submitted';
    progress.submittedAt = new Date();
    progress.submissionUrl = submissionUrl;
    progress.codeSubmission = codeSubmission;
    progress.demoUrl = demoUrl;
    progress.notes = notes;
    progress.attempts += 1;
    
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
