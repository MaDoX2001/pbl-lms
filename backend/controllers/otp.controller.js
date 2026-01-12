const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const OTP = require('../models/OTP.model');
const User = require('../models/User.model');
const { catchAsyncErrors, AppError } = require('../middleware/errorHandler');

// Generate OTP Secret
exports.generateOTPSecret = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id; // Get from authenticated user

  // Check if user already has OTP enabled
  const existingOTP = await OTP.findOne({ userId, isEnabled: true });
  if (existingOTP) {
    return next(new AppError('لديك بالفعل مصادقة ثنائية مفعلة', 400));
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `منصة التعلم بالمشروعات (${req.user.email})`,
    issuer: 'PBL-LMS',
    length: 32
  });

  // Generate QR Code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  });

  // Save OTP (not enabled yet)
  let otp = await OTP.findOne({ userId });
  
  if (otp) {
    otp.secret = secret.base32;
    otp.qrCode = qrCode;
    otp.backupCodes = backupCodes;
    otp.isEnabled = false;
  } else {
    otp = new OTP({
      userId,
      secret: secret.base32,
      qrCode,
      backupCodes,
      isEnabled: false
    });
  }

  await otp.save();

  res.status(200).json({
    success: true,
    message: 'تم توليد رمز OTP بنجاح',
    qrCode,
    backupCodes,
    secret: secret.base32
  });
});

// Verify OTP and Enable 2FA
exports.enableOTP = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.body;
  const userId = req.user._id; // Get from authenticated user

  if (!token) {
    return next(new AppError('رمز OTP مطلوب', 400));
  }

  const otp = await OTP.findOne({ userId });
  if (!otp) {
    return next(new AppError('لم يتم العثور على بيانات OTP', 404));
  }

  if (!otp.validateToken(token)) {
    await otp.save();
    return next(new AppError('رمز OTP غير صحيح', 401));
  }

  otp.isEnabled = true;
  otp.enabledAt = new Date();
  otp.failedAttempts = 0;
  await otp.save();

  // Update user
  await User.findByIdAndUpdate(userId, { twoFactorEnabled: true });

  res.status(200).json({
    success: true,
    message: 'تم تفعيل المصادقة الثنائية بنجاح',
    backupCodes: otp.backupCodes
  });
});

// Verify OTP During Login
exports.verifyOTPLogin = catchAsyncErrors(async (req, res, next) => {
  const { userId, token, useBackupCode } = req.body;

  if (!token) {
    return next(new AppError('رمز OTP مطلوب', 400));
  }

  const otp = await OTP.findOne({ userId, isEnabled: true });
  if (!otp) {
    return next(new AppError('المصادقة الثنائية غير مفعلة', 400));
  }

  let isValid = false;

  if (useBackupCode) {
    isValid = otp.useBackupCode(token);
    if (!isValid) {
      return next(new AppError('رمز النسخة الاحتياطية غير صحيح', 401));
    }
  } else {
    isValid = otp.validateToken(token);
    if (!isValid) {
      await otp.save();
      return next(new AppError('رمز OTP غير صحيح', 401));
    }
  }

  await otp.save();

  // Get user and generate JWT token
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('المستخدم غير موجود', 404));
  }

  // Generate JWT token
  const generateToken = (id) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  };

  const jwtToken = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'تم التحقق من OTP بنجاح',
    data: {
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    }
  });
});

// Disable OTP (2FA)
exports.disableOTP = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const otp = await OTP.findOne({ userId });
  if (!otp) {
    return next(new AppError('المصادقة الثنائية غير مفعلة', 400));
  }

  otp.isEnabled = false;
  otp.secret = null;
  otp.qrCode = null;
  otp.backupCodes = [];
  otp.failedAttempts = 0;
  otp.lockoutUntil = null;
  await otp.save();

  // Update user
  await User.findByIdAndUpdate(userId, { twoFactorEnabled: false });

  res.status(200).json({
    success: true,
    message: 'تم تعطيل المصادقة الثنائية'
  });
});

// Get OTP Status
exports.getOTPStatus = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const otp = await OTP.findOne({ userId });

  res.status(200).json({
    success: true,
    isEnabled: otp?.isEnabled || false,
    lastUsedAt: otp?.lastUsedAt || null,
    enabledAt: otp?.enabledAt || null,
    remainingBackupCodes: otp?.backupCodes?.filter(code => code !== null).length || 0
  });
});

// Regenerate Backup Codes
exports.regenerateBackupCodes = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const otp = await OTP.findOne({ userId, isEnabled: true });
  if (!otp) {
    return next(new AppError('المصادقة الثنائية غير مفعلة', 400));
  }

  const newBackupCodes = Array.from({ length: 10 }, () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  });

  otp.backupCodes = newBackupCodes;
  await otp.save();

  res.status(200).json({
    success: true,
    message: 'تم توليد رموز احتياطية جديدة',
    backupCodes: newBackupCodes
  });
});
