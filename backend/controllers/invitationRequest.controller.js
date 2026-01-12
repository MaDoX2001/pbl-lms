const InvitationRequest = require('../models/InvitationRequest.model');
const Invitation = require('../models/Invitation.model');
const User = require('../models/User.model');
const nodemailer = require('nodemailer');
const { catchAsyncErrors, AppError } = require('../middleware/errorHandler');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const sendAdminNotification = async (email, name, role) => {
  const roleAr = role === 'student' ? 'طالب' : 'معلم';
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `طلب دعوة جديد - ${roleAr}`,
    html: `<h2>طلب دعوة جديد</h2><p>الاسم: ${name}</p><p>البريد: ${email}</p><p>الدور: ${roleAr}</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('خطأ في إرسال البريد:', error);
  }
};

const sendInvitationEmail = async (email, name, token, role) => {
  const invitationLink = `${process.env.CLIENT_URL}/register?token=${token}&role=${role}`;
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'مرحباً بك في منصة التعلم بالمشروعات',
    html: `<h2>مرحباً ${name}</h2><p><a href="${invitationLink}">إكمال التسجيل</a></p>`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('خطأ في إرسال البريد:', error);
  }
};

const sendApprovalEmail = async (email, name) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'تم قبول طلب الانضمام!',
    html: `<h2>مرحباً ${name}</h2><p>تم قبول طلب الانضمام الخاص بك بنجاح! يمكنك الآن تسجيل الدخول بالبيانات التي أدخلتها.</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('خطأ في إرسال البريد:', error);
  }
};

const sendRejectionEmail = async (email, name, reason) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'رفض طلب الانضمام',
    html: `<h2>مرحباً ${name}</h2><p>للأسف، تم رفض طلب الانضمام الخاص بك.</p><p><strong>السبب:</strong> ${reason}</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('خطأ في إرسال البريد:', error);
  }
};

exports.requestInvitation = catchAsyncErrors(async (req, res, next) => {
  const { email, name, role, password } = req.body;

  console.log('Request body:', { email, name, role, hasPassword: !!password });

  if (!['student', 'teacher'].includes(role)) {
    console.log('Invalid role:', role);
    return next(new AppError('الدور يجب أن يكون student أو teacher', 400));
  }

  if (!password) {
    console.log('Password missing');
    return next(new AppError('كلمة المرور مطلوبة', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('User already exists:', email);
    return next(new AppError('هذا البريد الإلكتروني مسجل بالفعل', 400));
  }

  const existingRequest = await InvitationRequest.findOne({ email, status: 'pending' });
  if (existingRequest) {
    console.log('Pending request exists:', email);
    return next(new AppError('طلب دعوة معلق بالفعل لهذا البريد الإلكتروني', 400));
  }

  const invitationRequest = new InvitationRequest({
    email,
    name,
    requestedRole: role,
    password
  });

  await invitationRequest.save();
  await sendAdminNotification(email, name, role);

  res.status(201).json({
    success: true,
    message: 'تم إرسال طلب الدعوة بنجاح',
    requestId: invitationRequest._id
  });
});

exports.getAllInvitationRequests = catchAsyncErrors(async (req, res, next) => {
  const { status, role, page = 1, limit = 10 } = req.query;

  let filter = {};
  if (status) filter.status = status;
  if (role) filter.requestedRole = role;

  const skip = (page - 1) * limit;

  const requests = await InvitationRequest.find(filter)
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .sort({ requestedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await InvitationRequest.countDocuments(filter);

  res.status(200).json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: requests
  });
});

exports.getInvitationRequest = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const request = await InvitationRequest.findById(id)
    .populate('requestedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('generatedInvitation');

  if (!request) {
    return next(new AppError('طلب الدعوة غير موجود', 404));
  }

  res.status(200).json({
    success: true,
    data: request
  });
});

exports.approveInvitationRequest = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.user._id;

  const request = await InvitationRequest.findById(id);
  if (!request) {
    return next(new AppError('طلب الدعوة غير موجود', 404));
  }

  if (request.status !== 'pending') {
    return next(new AppError('لا يمكن الموافقة على طلب تم الرد عليه بالفعل', 400));
  }

  // Create user account directly
  const newUser = new User({
    name: request.name,
    email: request.email,
    password: request.password,
    role: request.requestedRole
  });

  await newUser.save();

  // Update request status
  request.status = 'approved';
  request.approvedBy = adminId;
  request.respondedAt = new Date();
  await request.save();

  // Send approval email
  await sendApprovalEmail(request.email, request.name);

  res.status(200).json({
    success: true,
    message: 'تم الموافقة على الطلب وإنشاء الحساب بنجاح',
    userId: newUser._id
  });
});

exports.rejectInvitationRequest = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user._id;

  if (!reason) {
    return next(new AppError('يجب توفير سبب الرفض', 400));
  }

  const request = await InvitationRequest.findById(id);
  if (!request) {
    return next(new AppError('طلب الدعوة غير موجود', 404));
  }

  if (request.status !== 'pending') {
    return next(new AppError('لا يمكن رفض طلب تم الرد عليه بالفعل', 400));
  }

  request.status = 'rejected';
  request.approvedBy = adminId;
  request.respondedAt = new Date();
  request.rejectionReason = reason;
  await request.save();

  await sendRejectionEmail(request.email, request.name, reason);

  res.status(200).json({
    success: true,
    message: 'تم رفض الطلب'
  });
});

exports.checkRequestStatus = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.query;

  if (!email) {
    return next(new AppError('البريد الإلكتروني مطلوب', 400));
  }

  const request = await InvitationRequest.findOne({ email }).select('status requestedAt respondedAt rejectionReason');

  res.status(200).json({
    success: true,
    found: !!request,
    data: request || null
  });
});
