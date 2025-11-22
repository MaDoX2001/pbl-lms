const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
    default: 'student'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

// Generate unique token before saving
invitationSchema.pre('save', function(next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Check if invitation is expired
invitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Index for faster queries
invitationSchema.index({ token: 1 });
invitationSchema.index({ email: 1 });
invitationSchema.index({ used: 1, expiresAt: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
