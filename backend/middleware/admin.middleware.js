// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول - صلاحيات المدير فقط'
    });
  }
};

// Middleware to check if user is admin or teacher
const teacherOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول - صلاحيات المعلم أو المدير فقط'
    });
  }
};

module.exports = { adminOnly, teacherOrAdmin };
