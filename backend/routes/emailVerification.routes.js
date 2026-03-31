const express = require('express');
const router = express.Router();
const {
  sendEmailVerificationOTP,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  requestTOTPReset,
  resetTOTP
} = require('../controllers/emailVerification.controller');
const { authLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

// Email Verification
router.post('/send-verification-otp', authLimiter, sendEmailVerificationOTP);
router.post('/verify-email', authLimiter, verifyEmail);

// Password Reset
router.post('/forgot-password', resetPasswordLimiter, requestPasswordReset);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// TOTP Reset
router.post('/request-totp-reset', resetPasswordLimiter, requestTOTPReset);
router.post('/reset-totp', resetPasswordLimiter, resetTOTP);

module.exports = router;
