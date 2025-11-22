const Project = require('../models/Project.model');
const User = require('../models/User.model');
const Progress = require('../models/Progress.model');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Public
exports.getAllProjects = async (req, res) => {
  try {
    const { difficulty, category, search, sort } = req.query;
    
    // Build query
    let query = { isPublished: true };
    
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
    
    res.json({
      success: true,
      count: projects.length,
      data: projects
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
    
    res.json({
      success: true,
      data: project
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
