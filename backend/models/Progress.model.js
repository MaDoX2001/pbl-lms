const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'submitted', 'reviewed', 'completed'],
    default: 'not-started'
  },
  startedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  milestoneProgress: [{
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    tasksCompleted: [{
      taskId: mongoose.Schema.Types.ObjectId,
      completedAt: Date
    }]
  }],
  submissionUrl: {
    type: String
  },
  submissionFiles: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  codeSubmission: {
    type: String
  },
  demoUrl: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [1000, 'الملاحظات لا يمكن أن تتجاوز 1000 حرف']
  },
  feedback: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: String,
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    reviewedAt: Date,
    strengths: [String],
    improvements: [String]
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // بالدقائق
    default: 0
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique student-project combination
progressSchema.index({ student: 1, project: 1 }, { unique: true });
progressSchema.index({ student: 1, status: 1 });
progressSchema.index({ project: 1, status: 1 });

// Update lastActivityAt on save
progressSchema.pre('save', function(next) {
  this.lastActivityAt = new Date();
  next();
});

// Calculate completion percentage
progressSchema.methods.getCompletionPercentage = function() {
  if (!this.milestoneProgress || this.milestoneProgress.length === 0) {
    return 0;
  }
  
  const completed = this.milestoneProgress.filter(m => m.completed).length;
  return Math.round((completed / this.milestoneProgress.length) * 100);
};

module.exports = mongoose.model('Progress', progressSchema);
