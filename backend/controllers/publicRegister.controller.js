const User = require('../models/User.model');

// @desc    Public registration (pending admin approval)
// @route   POST /api/auth/public-register
// @access  Public
exports.publicRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    // Validate role
    const userRole = role && ['student', 'teacher'].includes(role) ? role : 'student';

    // Create user with pending approval
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      isActive: false, // Inactive until approved
      isApproved: false,
      approvalStatus: 'pending',
      twoFactorSetupRequired: true // Require 2FA for all public registrations
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح. سيتم مراجعته من قبل المشرف',
      data: {
        userId: user._id,
        email: user.email,
        approvalStatus: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التسجيل',
      error: error.message
    });
  }
};

// @desc    Get pending approval users (Admin only)
// @route   GET /api/admin/pending-users
// @access  Private/Admin
exports.getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      approvalStatus: 'pending' 
    }).select('-password -twoFactorSecret');

    res.json({
      success: true,
      count: pendingUsers.length,
      data: pendingUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين',
      error: error.message
    });
  }
};

// @desc    Approve user registration
// @route   PUT /api/admin/approve-user/:id
// @access  Private/Admin
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    user.isApproved = true;
    user.isActive = true;
    user.approvalStatus = 'approved';
    await user.save();

    res.json({
      success: true,
      message: 'تم قبول المستخدم بنجاح',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الموافقة على المستخدم',
      error: error.message
    });
  }
};

// @desc    Reject user registration
// @route   PUT /api/admin/reject-user/:id
// @access  Private/Admin
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    user.approvalStatus = 'rejected';
    await user.save();

    res.json({
      success: true,
      message: 'تم رفض المستخدم',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في رفض المستخدم',
      error: error.message
    });
  }
};
