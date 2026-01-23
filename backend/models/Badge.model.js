const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#FFD700'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  awardedTo: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    awardedAt: {
      type: Date,
      default: Date.now
    },
    evaluationAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EvaluationAttempt'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
badgeSchema.index({ project: 1 });
badgeSchema.index({ 'awardedTo.student': 1 });

module.exports = mongoose.model('Badge', badgeSchema);
