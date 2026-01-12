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
  driveFileId: {
    type: String,
    required: true
  },
  driveFileUrl: {
    type: String,
    required: true
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
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ 'assignment.projectId': 1, student: 1 });
submissionSchema.index({ 'assignment.assignmentId': 1, student: 1 });
submissionSchema.index({ student: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
