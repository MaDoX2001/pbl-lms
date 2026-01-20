const express = require('express');
const router = express.Router();
const User = require('../models/User.model');
const Progress = require('../models/Progress.model');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth.middleware');
const cloudinaryService = require('../services/cloudinary.service');

// Multer configuration for avatar upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يجب رفع صورة فقط'), false);
    }
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

// @desc    Get leaderboard
// @route   GET /api/users/stats/leaderboard
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

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get progress data
    const progressData = await Progress.find({ student: userId })
      .populate('project', 'title');
    
    // Calculate stats
    const completedProjects = progressData.filter(p => p.status === 'completed').length;
    const inProgressProjects = progressData.filter(p => p.status === 'in-progress').length;
    
    // Get user for points
    const user = await User.findById(userId).select('points');
    
    // Calculate rank
    const usersAbove = await User.countDocuments({ 
      role: 'student', 
      points: { $gt: user.points } 
    });
    const rank = usersAbove + 1;
    
    res.json({
      completedProjects,
      inProgressProjects,
      totalPoints: user.points || 0,
      rank
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, avatar } = req.body;
    
    // Check if email is already taken by another user
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل'
        });
      }
    }
    
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي',
      error: error.message
    });
  }
});

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
router.post('/upload-avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يجب رفع صورة'
      });
    }

    // Upload to Cloudinary
    const folder = `pbl-lms/avatars/${req.user.id}`;
    const uploadResult = await cloudinaryService.uploadFile(
      req.file.buffer,
      `avatar-${Date.now()}.${req.file.mimetype.split('/')[1]}`,
      folder
    );

    res.json({
      success: true,
      url: uploadResult.url,
      message: 'تم رفع الصورة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصورة',
      error: error.message
    });
  }
});

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كلمة المرور الحالية والجديدة'
      });
    }
    
    // Get user with password
    const user = await User.findById(userId).select('+password');
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور',
      error: error.message
    });
  }
});

// @desc    Get user public profile
// @route   GET /api/users/:id/public
// @access  Private
// Rules:
// - Teacher/Admin: can see any user
// - Student: can only see team members and teachers/admins
router.get('/:id/public', protect, async (req, res) => {
  try {
    const currentUser = req.user;
    const targetUserId = req.params.id;

    // Fetch target user
    const targetUser = await User.findById(targetUserId)
      .populate('completedProjects', 'title difficulty coverImage points')
      .select('-password');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // ACCESS CONTROL
    // Teacher/Admin can see everyone
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
      return res.json({
        success: true,
        data: targetUser
      });
    }

    // Students can only see:
    // 1. Teachers and Admins
    // 2. Team members (students in same team)
    if (currentUser.role === 'student') {
      // Can see teachers and admins
      if (targetUser.role === 'teacher' || targetUser.role === 'admin') {
        return res.json({
          success: true,
          data: targetUser
        });
      }

      // Check if both are in same team
      const Team = require('../models/Team.model');
      const commonTeam = await Team.findOne({
        members: { $all: [currentUser.id, targetUserId] }
      });

      if (commonTeam) {
        return res.json({
          success: true,
          data: targetUser
        });
      }

      // Not authorized
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لعرض هذا الملف الشخصي'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية لعرض الملفات الشخصية'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملف الشخصي',
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

module.exports = router;
