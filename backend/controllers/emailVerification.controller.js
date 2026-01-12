const User = require('../models/User.model');
const axios = require('axios');
const { catchAsyncErrors, AppError } = require('../middleware/errorHandler');

// Configure Brevo API
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

console.log('Brevo API Key exists:', !!BREVO_API_KEY);
console.log('Brevo API Key length:', BREVO_API_KEY ? BREVO_API_KEY.length : 0);

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email using Brevo API
const sendBrevoEmail = async (to, subject, htmlContent) => {
  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: 'منصة التعلم بالمشروعات',
          email: 'mohamed31013026@science.tanta.edu.eg'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent
      },
      {
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Brevo API Error:', error.response?.data || error.message);
    throw new Error('فشل إرسال البريد الإلكتروني');
  }
};

// Send Email Verification OTP
exports.sendEmailVerificationOTP = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('البريد الإلكتروني مطلوب', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('المستخدم غير موجود', 404));
  }

  if (user.emailVerified) {
    return next(new AppError('البريد الإلكتروني مفعل بالفعل', 400));
  }

  // Generate OTP
  const otp = generateOTP();
  user.emailVerificationOTP = otp;
  user.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send email using Brevo API
  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>مرحباً ${user.name}</h2>
      <p>شكراً للتسجيل في منصة التعلم بالمشروعات!</p>
      <p>رمز التفعيل الخاص بك هو:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>هذا الرمز صالح لمدة 10 دقائق فقط.</p>
      <p>إذا لم تقم بالتسجيل في منصتنا، يرجى تجاهل هذه الرسالة.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">منصة التعلم بالمشروعات © 2026</p>
    </div>
  `;

  await sendBrevoEmail(email, 'تفعيل البريد الإلكتروني - PBL-LMS', htmlContent);

  res.status(200).json({
    success: true,
    message: 'تم إرسال رمز التفعيل إلى بريدك الإلكتروني'
  });
});

// Verify Email with OTP
exports.verifyEmail = catchAsyncErrors(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError('البريد الإلكتروني ورمز التفعيل مطلوبان', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('المستخدم غير موجود', 404));
  }

  if (user.emailVerified) {
    return next(new AppError('البريد الإلكتروني مفعل بالفعل', 400));
  }

  if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp) {
    return next(new AppError('رمز التفعيل غير صحيح', 400));
  }

  if (Date.now() > user.emailVerificationOTPExpires) {
    return next(new AppError('رمز التفعيل منتهي الصلاحية', 400));
  }

  // Mark email as verified
  user.emailVerified = true;
  user.emailVerificationOTP = undefined;
  user.emailVerificationOTPExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'تم تفعيل البريد الإلكتروني بنجاح'
  });
});

// Request Password Reset
exports.requestPasswordReset = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('البريد الإلكتروني مطلوب', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json({
      success: true,
      message: 'إذا كان البريد الإلكتروني موجوداً، سيتم إرسال رمز إعادة التعيين'
    });
  }

  // Generate OTP
  const otp = generateOTP();
  user.passwordResetOTP = otp;
  user.passwordResetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send email using Brevo API
  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>مرحباً ${user.name}</h2>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
      <p>رمز إعادة التعيين الخاص بك هو:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>هذا الرمز صالح لمدة 10 دقائق فقط.</p>
      <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">منصة التعلم بالمشروعات © 2026</p>
    </div>
  `;

  await sendBrevoEmail(email, 'إعادة تعيين كلمة المرور - PBL-LMS', htmlContent);

  res.status(200).json({
    success: true,
    message: 'إذا كان البريد الإلكتروني موجوداً، سيتم إرسال رمز إعادة التعيين'
  });
});

// Verify Reset OTP and Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(new AppError('جميع الحقول مطلوبة', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('بيانات غير صحيحة', 400));
  }

  if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
    return next(new AppError('رمز إعادة التعيين غير صحيح', 400));
  }

  if (Date.now() > user.passwordResetOTPExpires) {
    return next(new AppError('رمز إعادة التعيين منتهي الصلاحية', 400));
  }

  // Reset password
  user.password = newPassword;
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'تم إعادة تعيين كلمة المرور بنجاح'
  });
});
