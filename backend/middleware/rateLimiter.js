const rateLimit = require('express-rate-limit');

const API_WINDOW_MINUTES = Number(process.env.API_RATE_LIMIT_WINDOW_MINUTES || 15);
const API_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX || 1000);
const AUTH_WINDOW_MINUTES = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15);
const AUTH_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX || 2000);

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: API_WINDOW_MINUTES * 60 * 1000,
  max: API_MAX_REQUESTS,
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
  windowMs: AUTH_WINDOW_MINUTES * 60 * 1000,
  max: AUTH_MAX_REQUESTS,
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
