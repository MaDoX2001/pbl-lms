const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  secret: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: {
    type: String // Data URL for QR code
  },
  backupCodes: [{
    type: String,
    default: null // null means already used
  }],
  isEnabled: {
    type: Boolean,
    default: false
  },
  enabledAt: {
    type: Date
  },
  lastUsedAt: {
    type: Date
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  lockoutUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
otpSchema.index({ userId: 1, isEnabled: 1 });

// Method to validate OTP
otpSchema.methods.validateToken = function(token) {
  if (this.lockoutUntil && new Date() < this.lockoutUntil) {
    throw new Error('حسابك مقفول مؤقتاً، حاول لاحقاً');
  }

  const speakeasy = require('speakeasy');
  const verified = speakeasy.totp.verify({
    secret: this.secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps in each direction
  });

  if (verified) {
    this.failedAttempts = 0;
    this.lastUsedAt = new Date();
    return true;
  }

  this.failedAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.failedAttempts >= 5) {
    this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  return false;
};

// Method to use backup code
otpSchema.methods.useBackupCode = function(code) {
  const index = this.backupCodes.indexOf(code);
  if (index !== -1) {
    this.backupCodes[index] = null;
    this.lastUsedAt = new Date();
    return true;
  }
  return false;
};

module.exports = mongoose.model('OTP', otpSchema);
