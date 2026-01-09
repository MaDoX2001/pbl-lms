// Global error handling middleware
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async function wrapper to catch errors
const catchAsyncErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'خطأ في الخادم';

  // Handle invalid JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'التوكن غير صحيح';
    err = new AppError(message, 401);
  }

  // Handle expired JWT
  if (err.name === 'TokenExpiredError') {
    const message = 'انتهت صلاحية التوكن';
    err = new AppError(message, 401);
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
    err = new AppError(message, 400);
  }

  // Handle mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} موجود بالفعل`;
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  AppError,
  catchAsyncErrors,
  errorHandler
};
