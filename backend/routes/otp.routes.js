const express = require('express');
const router = express.Router();
const {
  generateOTPSecret,
  enableOTP,
  verifyOTPLogin,
  disableOTP,
  getOTPStatus,
  regenerateBackupCodes
} = require('../controllers/otp.controller');
const { protect } = require('../middleware/auth.middleware');

// Generate OTP secret (QR code)
router.post('/generate', protect, generateOTPSecret);

// Enable OTP (2FA)
router.post('/enable', protect, enableOTP);

// Verify OTP during login
router.post('/verify-login', verifyOTPLogin);

// Disable OTP (2FA)
router.post('/disable', protect, disableOTP);

// Get OTP status
router.get('/status', protect, getOTPStatus);

// Regenerate backup codes
router.post('/regenerate-backup-codes', protect, regenerateBackupCodes);

module.exports = router;
