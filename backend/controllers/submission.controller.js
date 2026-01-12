const Submission = require('../models/Submission.model');
const Project = require('../models/Project.model');
const driveService = require('../services/drive.service');

// @desc    Submit homework (students only)
// @route   POST /api/projects/:projectId/assignments/:assignmentId/submit
// @access  Private (Student)
exports.submitHomework = async (req, res) => {
  try {
    const { projectId, assignmentId } = req.params;
    const { fileTitle, comments } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم تحميل ملف' });
    }

    // Check if project and assignment exist
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'المهمة غير موجودة' });
    }

    // Check if student is enrolled
    if (!project.enrolledStudents.includes(req.user.id)) {
      return res.status(403).json({ message: 'يجب التسجيل في المشروع أولاً' });
    }

    // Check file size
    if (req.file.size > assignment.maxFileSize) {
      return res.status(400).json({
        message: `حجم الملف يتجاوز الحد المسموح (${(assignment.maxFileSize / 1024 / 1024).toFixed(2)} MB)`
      });
    }

    // Check file type
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    if (!assignment.allowedFileTypes.includes(fileExt)) {
      return res.status(400).json({
        message: `نوع الملف غير مسموح. الأنواع المسموحة: ${assignment.allowedFileTypes.join(', ')}`
      });
    }

    // Check if submission is late
    const isLate = assignment.dueDate && new Date() > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({ message: 'انتهى موعد تسليم المهمة' });
    }

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({
      'assignment.projectId': projectId,
      'assignment.assignmentId': assignmentId,
      student: req.user.id
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'تم تسليم المهمة مسبقاً. لا يمكن إعادة التسليم' });
    }

    // Check if Drive service is initialized
    if (!driveService.drive) {
      console.error('Google Drive service not initialized, attempting to initialize...');
      try {
        await driveService.initialize();
      } catch (initError) {
        console.error('Failed to initialize Drive service:', initError);
        return res.status(503).json({ 
          message: 'خدمة Google Drive غير متاحة حالياً. يرجى المحاولة لاحقاً.',
          error: process.env.NODE_ENV === 'development' ? initError.message : undefined
        });
      }
    }

    // Find or create submissions folder in Drive
    const rootFolderId = await driveService.findOrCreateFolder('PBL-LMS-Content');
    const submissionsFolderId = await driveService.findOrCreateFolder('Student-Submissions', rootFolderId);
    const projectFolderId = await driveService.findOrCreateFolder(`Project-${projectId}`, submissionsFolderId);
    const assignmentFolderId = await driveService.findOrCreateFolder(`Assignment-${assignmentId}`, projectFolderId);
    const studentFolderId = await driveService.findOrCreateFolder(`Student-${req.user.id}`, assignmentFolderId);

    // Upload file to Google Drive
    const uploadResult = await driveService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      studentFolderId
    );

    // Create submission record
    const submission = await Submission.create({
      assignment: {
        projectId,
        assignmentId
      },
      student: req.user.id,
      fileTitle: fileTitle || req.file.originalname,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      driveFileId: uploadResult.fileId,
      driveFileUrl: uploadResult.webViewLink,
      comments: comments || '',
      isLate
    });

    await submission.populate('student', 'name email');

    res.status(201).json({
      message: 'تم تسليم المهمة بنجاح',
      submission
    });
  } catch (error) {
    console.error('Error submitting homework:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'خطأ في تسليم المهمة',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get submissions for an assignment (teacher/admin)
// @route   GET /api/projects/:projectId/assignments/:assignmentId/submissions
// @access  Private (Teacher/Admin)
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { projectId, assignmentId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check permissions
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بعرض التسليمات' });
    }

    const submissions = await Submission.find({
      'assignment.projectId': projectId,
      'assignment.assignmentId': assignmentId
    })
      .populate('student', 'name email')
      .populate('grade.gradedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'خطأ في جلب التسليمات' });
  }
};

// @desc    Get student's submissions for a project
// @route   GET /api/projects/:projectId/my-submissions
// @access  Private (Student)
exports.getMySubmissions = async (req, res) => {
  try {
    const { projectId } = req.params;

    const submissions = await Submission.find({
      'assignment.projectId': projectId,
      student: req.user.id
    })
      .populate('grade.gradedBy', 'name email')
      .sort({ submittedAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'خطأ في جلب التسليمات' });
  }
};

// @desc    Grade a submission (teacher/admin)
// @route   PUT /api/submissions/:submissionId/grade
// @access  Private (Teacher/Admin)
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    const submission = await Submission.findById(submissionId).populate('assignment.projectId');
    if (!submission) {
      return res.status(404).json({ message: 'التسليم غير موجود' });
    }

    const project = await Project.findById(submission.assignment.projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check permissions
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بتقييم التسليمات' });
    }

    // Update grade
    submission.grade = {
      score,
      feedback: feedback || '',
      gradedBy: req.user.id,
      gradedAt: new Date()
    };
    submission.status = 'graded';

    await submission.save();
    await submission.populate('student', 'name email');
    await submission.populate('grade.gradedBy', 'name email');

    res.json({
      message: 'تم تقييم التسليم بنجاح',
      submission
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: 'خطأ في تقييم التسليم' });
  }
};

// @desc    Delete a submission (student can delete their own before grading)
// @route   DELETE /api/submissions/:submissionId
// @access  Private
exports.deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'التسليم غير موجود' });
    }

    // Students can only delete their own ungraded submissions
    if (req.user.role === 'student') {
      if (submission.student.toString() !== req.user.id) {
        return res.status(403).json({ message: 'غير مصرح لك بحذف هذا التسليم' });
      }
      if (submission.status === 'graded') {
        return res.status(400).json({ message: 'لا يمكن حذف التسليم بعد التقييم' });
      }
    }

    // Delete from Google Drive
    await driveService.deleteFile(submission.driveFileId);

    // Delete submission record
    await submission.deleteOne();

    res.json({ message: 'تم حذف التسليم بنجاح' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ message: 'خطأ في حذف التسليم' });
  }
};

// @desc    Download a submission file
// @route   GET /api/submissions/:submissionId/download
// @access  Private
exports.downloadSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'التسليم غير موجود' });
    }

    // Check permissions: student can download own submission, teacher/admin can download any
    const project = await Project.findById(submission.assignment.projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    const isOwner = submission.student.toString() === req.user.id;
    const isInstructor = project.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({ message: 'غير مصرح لك بتحميل هذا الملف' });
    }

    // Get file from Google Drive
    const fileStream = await driveService.downloadFile(submission.driveFileId);

    // Set headers for download
    res.setHeader('Content-Type', submission.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(submission.fileName)}"`);

    // Pipe the file stream to response
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading submission:', error);
    res.status(500).json({ message: 'خطأ في تحميل الملف' });
  }
};
