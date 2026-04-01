const mongoose = require('mongoose');

const assessmentRetryArchiveSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scope: {
    type: String,
    enum: ['team', 'student'],
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  },
  snapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  summary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

assessmentRetryArchiveSchema.index({ project: 1, team: 1, createdAt: -1 });
assessmentRetryArchiveSchema.index({ project: 1, student: 1, createdAt: -1 });
assessmentRetryArchiveSchema.index({ project: 1, scope: 1, createdAt: -1 });

module.exports = mongoose.model('AssessmentRetryArchive', assessmentRetryArchiveSchema);
