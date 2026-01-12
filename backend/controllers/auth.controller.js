const User = require('../models/User.model');
const Invitation = require('../models/Invitation.model');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register a new user (invitation only)
// @route   POST /api/auth/register
// @access  Public (with valid invitation token)
exports.register = async (req, res) => {
  try {
    const { name, email, password, token } = req.body;

    // Validate invitation token
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'رمز الدعوة مطلوب. يرجى التواصل مع المدير للحصول على دعوة'
      });
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'رمز الدعوة غير صالح'
      });
    }

    if (invitation.used) {
      return res.status(400).json({
        success: false,
        message: 'تم استخدام هذه الدعوة مسبقاً'
      });
    }

    if (invitation.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية الدعوة'
      });
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني لا يتطابق مع الدعوة'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    // Create user with role from invitation
    const user = await User.create({
      name,
      email,
      password,
      role: invitation.role
    });

    // Mark invitation as used
    invitation.used = true;
    invitation.usedAt = new Date();
    invitation.usedBy = user._id;
    await invitation.save();

    // Generate token
    const authToken = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: authToken
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'هذا الحساب غير نشط'
      });
    }

    // Check if account is approved (skip for admins)
    if (user.role !== 'admin' && (!user.isApproved || user.approvalStatus !== 'approved')) {
      return res.status(403).json({
        success: false,
        message: 'حسابك في انتظار موافقة المشرف',
        approvalStatus: user.approvalStatus
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Admin bypass 2FA requirement
    if (user.role === 'admin') {
      const token = generateToken(user._id);
      
      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            points: user.points,
            level: user.level,
            twoFactorEnabled: false
          },
          token
        }
      });
    }

    // For non-admin users: Check if 2FA is set up
    if (!user.twoFactorEnabled) {
      // Require 2FA setup for all non-admin users
      const tempToken = generateToken(user._id);
      
      return res.json({
        success: true,
        message: 'يجب إعداد المصادقة الثنائية',
        requireSetup: true,
        data: {
          userId: user._id,
          token: tempToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            twoFactorSetupRequired: true
          }
        }
      });
    }

    // 2FA is enabled - require verification
    return res.json({
      success: true,
      message: 'يرجى إدخال رمز المصادقة الثنائية',
      requiresOTP: true,
      data: {
        userId: user._id,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الدخول',
      error: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledProjects', 'title difficulty')
      .populate('completedProjects', 'title difficulty');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم',
      error: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح',
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث كلمة المرور',
      error: error.message
    });
  }
};
