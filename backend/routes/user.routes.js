const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

// Helper function to calculate profile completion
const calculateProfileCompletion = (user) => {
  const fields = [
    { key: 'name', weight: 20 },
    { key: 'email', weight: 20 },
    { key: 'bio', weight: 15 },
    { key: 'avatar', weight: 15 },
    { key: 'skills', weight: 15, isArray: true },
    { key: 'twoFactorEnabled', weight: 15 }
  ];

  let totalWeight = 0;
  let completedWeight = 0;

  fields.forEach(field => {
    totalWeight += field.weight;
    
    if (field.isArray) {
      if (user[field.key] && user[field.key].length > 0) {
        completedWeight += field.weight;
      }
    } else {
      if (user[field.key]) {
        completedWeight += field.weight;
      }
    }
  });

  return Math.round((completedWeight / totalWeight) * 100);
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledProjects', 'title difficulty coverImage')
      .populate('completedProjects', 'title difficulty coverImage')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Calculate profile completion
    const profileCompletion = calculateProfileCompletion(user);

    // Add profile completion to response
    const userWithCompletion = {
      ...user.toObject(),
      profileCompletion
    };
    
    res.json({
      success: true,
      data: userWithCompletion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم',
      error: error.message
    });
  }
});

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const allowedFields = ['name', 'bio', 'avatar', 'skills'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    // Calculate profile completion
    const profileCompletion = calculateProfileCompletion(user);

    // Add profile completion to response
    const userWithCompletion = {
      ...user.toObject(),
      profileCompletion
    };
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: userWithCompletion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المستخدم',
      error: error.message
    });
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين',
      error: error.message
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('enrolledProjects', 'title difficulty coverImage')
      .populate('completedProjects', 'title difficulty coverImage');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدم',
      error: error.message
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    // Check authorization
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتحديث هذا المستخدم'
      });
    }
    
    const allowedFields = ['name', 'bio', 'avatar', 'skills'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المستخدم',
      error: error.message
    });
  }
});

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
router.get('/stats/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = await User.find({ role: 'student' })
      .select('name avatar points level completedProjects')
      .sort({ points: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب لوحة المتصدرين',
      error: error.message
    });
  }
});

module.exports = router;
