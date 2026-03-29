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
  wiringImageUrl: {
    type: String
  },
  demoUrl: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [1000, 'الملاحظات لا يمكن أن تتجاوز 1000 حرف']
  },
  submissionHistory: [{
    attemptNumber: {
      type: Number,
      required: true
    },
    submittedAt: {
      type: Date,
      required: true
    },
    submissionUrl: String,
    codeSubmission: String,
    wiringImageUrl: String,
    demoUrl: String,
    notes: String,
    submissionFiles: [{
      filename: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    feedback: {
      reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comments: String,
      reviewedAt: Date,
      allowResubmission: {
        type: Boolean,
        default: false
      }
    }
  }],
  feedbackHistory: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: String,
    reviewedAt: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['manual', 'ai-assisted', 'ai-batch'],
      default: 'manual'
    },
    aiMeta: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      approvedAt: {
        type: Date,
        default: null
      },
      confidence: {
        type: Number,
        default: null
      },
      plagiarismSimilarityPercent: {
        type: Number,
        default: null
      },
      plagiarismLevel: {
        type: String,
        default: null
      }
    },
    allowResubmission: {
      type: Boolean,
      default: false
    }
  }],
  resubmissionAllowed: {
    type: Boolean,
    default: false
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
    source: {
      type: String,
      enum: ['manual', 'ai-assisted', 'ai-batch'],
      default: 'manual'
    },
    aiMeta: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      approvedAt: {
        type: Date,
        default: null
      },
      confidence: {
        type: Number,
        default: null
      },
      plagiarismSimilarityPercent: {
        type: Number,
        default: null
      },
      plagiarismLevel: {
        type: String,
        default: null
      }
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
