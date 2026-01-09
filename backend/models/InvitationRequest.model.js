const mongoose = require('mongoose');

const invitationRequestSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'البريد الإلكتروني غير صالح']
  },
  name: {
    type: String,
    required: [true, 'الاسم مطلوب'],
    trim: true,
    minlength: [3, 'الاسم يجب أن يكون 3 أحرف على الأقل']
  },
  requestedRole: {
    type: String,
    enum: ['student', 'teacher'],
    required: true
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  generatedInvitation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invitation',
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
invitationRequestSchema.index({ email: 1, status: 1 });
invitationRequestSchema.index({ requestedRole: 1, status: 1 });
invitationRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('InvitationRequest', invitationRequestSchema);
