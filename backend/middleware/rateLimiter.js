const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'تم تجاوز عدد الطلبات المسموح به، حاول مرة أخرى لاحقاً',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes (effectively unlimited)
  message: 'عدد محاولات تسجيل الدخول كثير، حاول مرة أخرى لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Skip counting successful requests
});

// Rate limiter for password reset
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'عدد محاولات إعادة تعيين كلمة المرور كثير، حاول مرة أخرى لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  resetPasswordLimiter
};
