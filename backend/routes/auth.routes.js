const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation.middleware');
const { protect } = require('../middleware/auth.middleware');
const Invitation = require('../models/Invitation.model');
const {
  register,
  login,
  getMe,
  updatePassword
} = require('../controllers/auth.controller');

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('الاسم يجب أن يكون بين 2 و 50 حرفاً'),
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('token').notEmpty().withMessage('رمز الدعوة مطلوب')
];

const loginValidation = [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة')
];

// Check invitation validity
router.get('/invitation/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ token: req.params.token });
    
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'الدعوة غير موجودة' });
    }

    if (invitation.used) {
      return res.status(400).json({ success: false, message: 'تم استخدام هذه الدعوة' });
    }

    if (invitation.isExpired()) {
      return res.status(400).json({ success: false, message: 'انتهت صلاحية الدعوة' });
    }

    res.json({ 
      success: true, 
      data: { 
        email: invitation.email, 
        role: invitation.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;
