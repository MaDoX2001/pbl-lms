const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment: {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    assignmentId: {
      type: String,
      required: true
    }
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileTitle: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: String,
  fileSize: Number, // in bytes
  cloudinaryId: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  resourceType: {
    type: String,
    enum: ['image', 'video', 'raw'],
    default: 'raw'
  },
  comments: String,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  grade: {
    score: Number,
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: Date
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  // Assessment system fields
  evaluationStatus: {
    type: String,
    enum: ['pending', 'under_evaluation', 'passed', 'failed'],
    default: 'pending'
  },
  evaluationAttempt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationAttempt'
  },
  finalScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ 'assignment.projectId': 1, student: 1 });
submissionSchema.index({ 'assignment.assignmentId': 1, student: 1 });
submissionSchema.index({ student: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
