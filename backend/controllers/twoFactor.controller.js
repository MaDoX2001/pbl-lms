const User = require('../models/User.model');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// @desc    Setup 2FA - Generate secret and QR code
// @route   POST /api/auth/2fa/setup
// @access  Private
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PBL-LMS (${user.email})`,
      issuer: 'PBL-LMS'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      message: 'تم إنشاء رمز QR بنجاح',
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32,
        manualEntryKey: secret.base32
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إعداد المصادقة الثنائية',
      error: error.message
    });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق يجب أن يكون 6 أرقام'
      });
    }

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إعداد المصادقة الثنائية أولاً'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps tolerance
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    user.twoFactorSetupRequired = false;
    await user.save();

    res.json({
      success: true,
      message: 'تم تفعيل المصادقة الثنائية بنجاح',
      data: {
        twoFactorEnabled: true,
        twoFactorVerified: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الرمز',
      error: error.message
    });
  }
};

// @desc    Verify 2FA token during login
// @route   POST /api/auth/2fa/verify-login
// @access  Public (with temp token)
exports.verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق يجب أن يكون 6 أرقام'
      });
    }

    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'المصادقة الثنائية غير مفعلة'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.json({
      success: true,
      message: 'تم التحقق بنجاح',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          points: user.points,
          level: user.level,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorSetupRequired: user.twoFactorSetupRequired
        },
        token: authToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الرمز',
      error: error.message
    });
  }
};

// @desc    Disable 2FA (admin or user with valid token)
// @route   POST /api/auth/2fa/disable
// @access  Private
exports.disable2FA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق مطلوب لتعطيل المصادقة الثنائية'
      });
    }

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'رمز التحقق غير صحيح'
      });
    }

    // Disable 2FA but keep setup required for mandatory 2FA
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    user.twoFactorSecret = undefined;
    user.twoFactorSetupRequired = true; // Must set up again
    await user.save();

    res.json({
      success: true,
      message: 'تم تعطيل المصادقة الثنائية. سيُطلب منك إعدادها مرة أخرى في تسجيل الدخول التالي',
      data: {
        twoFactorEnabled: false,
        twoFactorSetupRequired: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تعطيل المصادقة الثنائية',
      error: error.message
    });
  }
};

// @desc    Check 2FA status
// @route   GET /api/auth/2fa/status
// @access  Private
exports.get2FAStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorSetupRequired: user.twoFactorSetupRequired,
        twoFactorVerified: user.twoFactorVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حالة المصادقة الثنائية',
      error: error.message
    });
  }
};
