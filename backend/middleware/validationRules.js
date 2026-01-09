const { body, validationResult, param, query } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validations
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 3 }).withMessage('الاسم يجب أن يكون 3 أحرف على الأقل'),
  body('email')
    .trim()
    .isEmail().withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام'),
  body('role')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('الدور يجب أن يكون student أو teacher'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة'),
  handleValidationErrors
];

// Project validations
const validateCreateProject = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان المشروع مطلوب')
    .isLength({ min: 3 }).withMessage('العنوان يجب أن يكون 3 أحرف على الأقل'),
  body('description')
    .trim()
    .notEmpty().withMessage('الوصف مطلوب')
    .isLength({ min: 10 }).withMessage('الوصف يجب أن يكون 10 أحرف على الأقل'),
  body('category')
    .trim()
    .notEmpty().withMessage('الفئة مطلوبة'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('مستوى الصعوبة غير صحيح'),
  handleValidationErrors
];

// ID validations
const validateObjectId = [
  param('id')
    .isMongoId().withMessage('معرف غير صحيح'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateCreateProject,
  validateObjectId
};
