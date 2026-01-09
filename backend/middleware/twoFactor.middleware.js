const User = require('../models/User.model');

// @desc    Middleware to enforce 2FA setup
// @route   Middleware
// @access  Private
exports.require2FASetup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check if 2FA setup is required but not completed
    if (user.twoFactorSetupRequired && !user.twoFactorEnabled) {
      return res.status(403).json({
        success: false,
        message: 'يجب إعداد المصادقة الثنائية للمتابعة',
        requireSetup: true,
        redirect: '/2fa-setup'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من حالة المصادقة الثنائية',
      error: error.message
    });
  }
};

// @desc    Middleware to verify 2FA is enabled
// @route   Middleware
// @access  Private
exports.require2FAEnabled = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorVerified) {
      return res.status(403).json({
        success: false,
        message: 'المصادقة الثنائية غير مفعلة',
        requireSetup: true
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة الثنائية',
      error: error.message
    });
  }
};

// @desc    Bypass middleware for 2FA setup routes
// @route   Middleware
// @access  Private
exports.allow2FASetupRoutes = (req, res, next) => {
  // Allow access to 2FA setup routes without enforcing 2FA
  const allowedPaths = [
    '/api/auth/2fa/setup',
    '/api/auth/2fa/verify',
    '/api/auth/2fa/status',
    '/api/auth/me'
  ];

  if (allowedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // For other routes, continue to next middleware
  next();
};
