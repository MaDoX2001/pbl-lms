const Project = require('../models/Project.model');
const cloudinaryService = require('../services/cloudinary.service');

// @desc    Upload course material (teachers/admins only)
// @route   POST /api/projects/:projectId/materials
// @access  Private (Teacher/Admin)
exports.uploadCourseMaterial = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, fileType } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم تحميل ملف' });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check if user is instructor or admin
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بتحميل المواد لهذا المشروع' });
    }

    // Upload file to Cloudinary
    const folder = `pbl-lms/course-materials/project-${projectId}`;
    const uploadResult = await cloudinaryService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder
    );

    console.log('📋 Upload result:', {
      fileId: uploadResult.fileId,
      url: uploadResult.url,
      resourceType: uploadResult.resourceType
    });

    // Add material to project
    const material = {
      title: title || req.file.originalname,
      description: description || '',
      fileType: fileType || getFileTypeFromMime(req.file.mimetype),
      cloudinaryId: uploadResult.fileId,
      fileUrl: uploadResult.url,
      size: uploadResult.size,
      uploadedBy: req.user.id
    };

    project.courseMaterials.push(material);
    await project.save();

    res.status(201).json({
      message: 'تم تحميل المادة بنجاح',
      material: project.courseMaterials[project.courseMaterials.length - 1]
    });
  } catch (error) {
    console.error('Error uploading course material:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'خطأ في تحميل المادة',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all course materials for a project
// @route   GET /api/projects/:projectId/materials
// @access  Private
exports.getCourseMaterials = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .select('courseMaterials')
      .populate('courseMaterials.uploadedBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    res.json({ materials: project.courseMaterials });
  } catch (error) {
    console.error('Error fetching course materials:', error);
    res.status(500).json({ message: 'خطأ في جلب المواد' });
  }
};

// @desc    Delete course material
// @route   DELETE /api/projects/:projectId/materials/:materialId
// @access  Private (Teacher/Admin)
exports.deleteCourseMaterial = async (req, res) => {
  try {
    const { projectId, materialId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check permissions
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بحذف المواد' });
    }

    const material = project.courseMaterials.id(materialId);
    if (!material) {
      return res.status(404).json({ message: 'المادة غير موجودة' });
    }

    // Delete from Cloudinary
    await cloudinaryService.deleteFile(material.cloudinaryId, material.resourceType || 'raw');

    // Remove from project
    project.courseMaterials.pull(materialId);
    await project.save();

    res.json({ message: 'تم حذف المادة بنجاح' });
  } catch (error) {
    console.error('Error deleting course material:', error);
    res.status(500).json({ message: 'خطأ في حذف المادة' });
  }
};

// @desc    Create assignment
// @route   POST /api/projects/:projectId/assignments
// @access  Private (Teacher/Admin)
exports.createAssignment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate, maxScore, allowedFileTypes, maxFileSize, allowLateSubmission } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check permissions
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بإنشاء المهام' });
    }

    const assignment = {
      title,
      description,
      dueDate,
      maxScore: maxScore || 100,
      allowedFileTypes: allowedFileTypes || ['pdf', 'zip', 'docx', 'doc'],
      maxFileSize: maxFileSize || 10485760, // 10MB
      allowLateSubmission: allowLateSubmission || false,
      createdBy: req.user.id
    };

    project.assignments.push(assignment);
    await project.save();

    res.status(201).json({
      message: 'تم إنشاء المهمة بنجاح',
      assignment: project.assignments[project.assignments.length - 1]
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المهمة' });
  }
};

// @desc    Get all assignments for a project
// @route   GET /api/projects/:projectId/assignments
// @access  Private
exports.getAssignments = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .select('assignments')
      .populate('assignments.createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    res.json({ assignments: project.assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'خطأ في جلب المهام' });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/projects/:projectId/assignments/:assignmentId
// @access  Private (Teacher/Admin)
exports.deleteAssignment = async (req, res) => {
  try {
    const { projectId, assignmentId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'المشروع غير موجود' });
    }

    // Check permissions
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح لك بحذف المهام' });
    }

    project.assignments.pull(assignmentId);
    await project.save();

    res.json({ message: 'تم حذف المهمة بنجاح' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'خطأ في حذف المهمة' });
  }
};

// Helper function
function getFileTypeFromMime(mimeType) {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'other';
}
