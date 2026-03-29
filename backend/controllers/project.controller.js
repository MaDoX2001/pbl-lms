const Project = require('../models/Project.model');
const User = require('../models/User.model');
const Progress = require('../models/Progress.model');
const TeamProject = require('../models/TeamProject.model');
const mongoose = require('mongoose');
const cloudinaryService = require('../services/cloudinary.service');
const { normalizeProjectMilestones } = require('../utils/stagedSubmissionConfig');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
exports.getAllProjects = async (req, res) => {
  try {
    const { difficulty, category, search, sort } = req.query;

    // Teacher/Admin should see all projects (published and unpublished).
    // Guests and students only see published projects.
    const canViewUnpublished = req.user && (req.user.role === 'teacher' || req.user.role === 'admin');

    // Build query
    let query = canViewUnpublished ? {} : { isPublished: true };
    
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sort options
    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { 'rating.average': -1, 'rating.count': -1 };
    } else if (sort === 'recent') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'title') {
      sortOption = { title: 1 };
    }
    
    const projects = await Project.find(query)
      .populate('instructor', 'name avatar')
      .sort(sortOption)
      .select('-solution');

    const projectIds = projects.map((p) => p._id);
    const projectIdStrings = projectIds.map((id) => id.toString());
    const projectObjectIds = projectIdStrings
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Backward-compatible counting in case some legacy rows stored project as string.
    const teamEnrollments = await TeamProject.find({
      $or: [
        { project: { $in: projectObjectIds } },
        { project: { $in: projectIdStrings } }
      ]
    }).select('project');

    const teamCountMap = new Map();
    for (const row of teamEnrollments) {
      const key = String(row.project);
      teamCountMap.set(key, (teamCountMap.get(key) || 0) + 1);
    }

    const projectsWithCounts = projects.map((project) => {
      const plain = project.toObject();
      plain.enrolledTeamsCount = teamCountMap.get(project._id.toString()) || 0;
      return plain;
    });
    
    res.json({
      success: true,
      count: projectsWithCounts.length,
      data: projectsWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المشاريع',
      error: error.message
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('instructor', 'name avatar bio')
      .populate('prerequisites', 'title difficulty')
      .select('-solution');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }
    
    const projectIdString = String(project._id);
    const projectObjectId = new mongoose.Types.ObjectId(projectIdString);
    const enrolledTeamsCount = await TeamProject.countDocuments({
      $or: [
        { project: projectObjectId },
        { project: projectIdString }
      ]
    });
    const projectWithCount = project.toObject();
    projectWithCount.enrolledTeamsCount = enrolledTeamsCount;

    res.json({
      success: true,
      data: projectWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المشروع',
      error: error.message
    });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Teacher/Admin)
exports.createProject = async (req, res) => {
  try {
    // Add instructor from logged-in user
    req.body.instructor = req.user.id;
    req.body.milestones = normalizeProjectMilestones(req.body.milestones || []);
    
    const project = await Project.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المشروع',
      error: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Teacher/Admin)
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }
    
    // Check ownership
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المشروع'
      });
    }
    
    if (Object.prototype.hasOwnProperty.call(req.body, 'milestones')) {
      req.body.milestones = normalizeProjectMilestones(req.body.milestones || []);
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.json({
      success: true,
      message: 'تم تحديث المشروع بنجاح',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المشروع',
      error: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Teacher/Admin)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }
    
    // Check ownership
    if (project.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المشروع'
      });
    }
    
    await project.deleteOne();
    
    res.json({
      success: true,
      message: 'تم حذف المشروع بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المشروع',
      error: error.message
    });
  }
};

// @desc    Enroll in project
// @route   POST /api/projects/:id/enroll
// @access  Private (Student)
exports.enrollProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if already enrolled
    if (user.enrolledProjects.includes(project._id)) {
      return res.status(400).json({
        success: false,
        message: 'أنت مسجل بالفعل في هذا المشروع'
      });
    }
    
    // Add to enrolled projects
    user.enrolledProjects.push(project._id);
    project.enrolledStudents.push(user._id);
    
    await user.save();
    await project.save();
    
    // Create progress entry
    await Progress.create({
      student: user._id,
      project: project._id,
      status: 'in-progress',
      startedAt: new Date(),
      milestoneProgress: project.milestones.map(m => ({
        milestoneId: m._id,
        completed: false
      }))
    });
    
    res.json({
      success: true,
      message: 'تم التسجيل في المشروع بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التسجيل في المشروع',
      error: error.message
    });
  }
};
// @desc    Upload / update project cover image
// @route   PUT /api/projects/:id/cover
// @access  Private (Teacher who owns it / Admin)
exports.updateProjectCover = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    }

    const isOwner = project.instructor.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك' });
    }

    const uploadedFile = req.files?.cover?.[0] || req.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع صورة' });
    }

    // Delete old cover from R2 if stored there
    if (project.coverImageId) {
      try { await cloudinaryService.deleteFile(project.coverImageId); } catch (_) {}
    }

    const result = await cloudinaryService.uploadFile(
      uploadedFile.buffer,
      uploadedFile.originalname,
      `pbl-lms/project-covers`
    );

    project.coverImage = result.url;
    project.coverImageId = result.fileId;
    await project.save();

    res.json({ success: true, message: 'تم تحديث صورة الغلاف', coverImage: result.url });
  } catch (error) {
    console.error('Error updating project cover:', error);
    res.status(500).json({ success: false, message: 'خطأ في رفع الصورة: ' + error.message });
  }
};