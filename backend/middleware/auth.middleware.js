const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذا المسار'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'هذا الحساب غير نشط'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول إلى هذا المسار'
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `دور المستخدم ${req.user.role} غير مصرح له بالوصول إلى هذا المسار`
      });
    }
    next();
  };
};
