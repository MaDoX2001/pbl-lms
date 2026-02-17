const Project = require('../models/Project.model');
const Resource = require('../models/Resource.model');
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

// ============================================================================
// SUPPORT RESOURCES (رابط مصادر تعليمية عامة للطلاب والمعلمين)
// ============================================================================

// @desc    Upload a support resource
// @route   POST /api/resources/support/upload
// @access  Private (Student/Teacher/Admin)
exports.uploadSupportResource = async (req, res) => {
  try {
    console.log('=== UPLOAD RESOURCE DEBUG ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    console.log('File:', req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'No file');
    
    const { title, description, resourceType, category, difficulty, tags } = req.body;

    if (!title || !resourceType) {
      console.log('Missing title or resourceType');
      return res.status(400).json({
        success: false,
        message: 'العنوان ونوع المصدر مطلوبة'
      });
    }

    // If file uploaded
    let fileUrl = req.body.fileUrl;
    let cloudinaryId = req.body.cloudinaryId;
    let fileSize = req.body.fileSize;
    let fileType = req.body.fileType;

    if (req.file) {
      console.log('Uploading file to Cloudinary:', req.file.originalname);
      const folder = 'pbl-lms/support-resources';
      try {
        const uploadResult = await cloudinaryService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          folder
        );
        console.log('Cloudinary upload success:', uploadResult);
        fileUrl = uploadResult.url;
        cloudinaryId = uploadResult.fileId;
        fileSize = uploadResult.size;
        fileType = req.file.mimetype;
      } catch (cloudError) {
        console.error('Cloudinary upload error:', cloudError);
        throw cloudError;
      }
    }

    // For links (YouTube, external resources)
    if (!fileUrl && req.body.externalUrl) {
      fileUrl = req.body.externalUrl;
    }

    if (!fileUrl) {
      console.log('No fileUrl or externalUrl provided');
      return res.status(400).json({
        success: false,
        message: 'رابط الملف أو الملف المرفوع مطلوب'
      });
    }

    console.log('Creating resource with:', {
      title, resourceType, category, difficulty, uploadedBy: req.user.id, isApproved: req.user.role === 'admin'
    });

    const resource = await Resource.create({
      title,
      description,
      resourceType,
      category: category || 'أخرى',
      difficulty: difficulty || 'متوسط',
      fileUrl,
      cloudinaryId,
      fileSize,
      fileType,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      uploadedBy: req.user.id,
      isApproved: req.user.role === 'admin' ? true : false
    });

    console.log('Resource created:', resource._id);

    await resource.populate('uploadedBy', 'name avatar email');

    res.status(201).json({
      success: true,
      message: 'تم رفع المصدر التعليمي بنجاح',
      data: resource
    });
  } catch (error) {
    console.error('=== ERROR UPLOADING SUPPORT RESOURCE ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع المصدر: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all support resources
// @route   GET /api/resources/support
// @access  Public
exports.getSupportResources = async (req, res) => {
  try {
    const { category, resourceType, difficulty, search, sort } = req.query;
    const Resource = require('../models/Resource.model');

    let query = { isApproved: true, isPublished: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (resourceType && resourceType !== 'all') {
      query.resourceType = resourceType;
    }

    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { views: -1 };
    }
    if (sort === 'rated') {
      sortOption = { 'rating.average': -1 };
    }
    if (sort === 'downloads') {
      sortOption = { downloads: -1 };
    }

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name avatar email')
      .sort(sortOption)
      .limit(50);

    res.json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    console.error('Error fetching support resources:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المصادر',
      error: error.message
    });
  }
};

// @desc    Get single support resource with view increment
// @route   GET /api/resources/support/:id
// @access  Public
exports.getSupportResource = async (req, res) => {
  try {
    const Resource = require('../models/Resource.model');
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('uploadedBy', 'name avatar email');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'المصدر غير موجود'
      });
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المصدر',
      error: error.message
    });
  }
};

// @desc    Delete my support resource
// @route   DELETE /api/resources/support/:id
// @access  Private
exports.deleteSupportResource = async (req, res) => {
  try {
    const Resource = require('../models/Resource.model');
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'المصدر غير موجود'
      });
    }

    // Check authorization
    if (resource.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المصدر'
      });
    }

    // Delete from Cloudinary
    if (resource.cloudinaryId) {
      try {
        await cloudinaryService.deleteFile(resource.cloudinaryId);
      } catch (err) {
        console.error('Error deleting from Cloudinary:', err);
      }
    }

    await Resource.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'تم حذف المصدر بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المصدر',
      error: error.message
    });
  }
};

// @desc    Rate support resource
// @route   PUT /api/resources/support/:id/rate
// @access  Private
exports.rateSupportResource = async (req, res) => {
  try {
    const { rating } = req.body;
    const Resource = require('../models/Resource.model');

    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 0 و 5'
      });
    }

    let resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'المصدر غير موجود'
      });
    }

    // Update rating
    const newAverage = (resource.rating.average * resource.rating.count + rating) / (resource.rating.count + 1);
    resource.rating.average = Math.round(newAverage * 10) / 10;
    resource.rating.count += 1;

    resource = await resource.save();
    await resource.populate('uploadedBy', 'name avatar email');

    res.json({
      success: true,
      message: 'شكراً لتقييمك',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حفظ التقييم',
      error: error.message
    });
  }
};

// @desc    Increment download count for support resource
// @route   PUT /api/resources/support/:id/download
// @access  Public
exports.downloadSupportResource = async (req, res) => {
  try {
    const Resource = require('../models/Resource.model');
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    ).populate('uploadedBy', 'name avatar email');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'المصدر غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تسجيل التحميل',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل التحميل',
      error: error.message
    });
  }
};

