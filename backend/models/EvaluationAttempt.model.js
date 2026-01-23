const mongoose = require('mongoose');

const evaluationAttemptSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  observationCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ObservationCard',
    required: true
  },
  evaluator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1
  },
  assessmentPartEvaluations: [{
    partName: {
      type: String,
      required: true,
      enum: ['project_evaluation', 'individual_evaluation', 'oral_evaluation']
    },
    partWeight: {
      type: Number,
      required: true
    },
    sectionEvaluations: [{
      sectionName: {
        type: String,
        required: true
      },
      sectionWeight: {
        type: Number,
        required: true
      },
      criterionSelections: [{
        criterionName: {
          type: String,
          required: true
        },
        selectedPercentage: {
          type: Number,
          required: true,
          enum: [0, 20, 40, 60, 80, 100]
        },
        selectedDescription: {
          type: String,
          required: true
        }
      }],
      calculatedSectionScore: {
        type: Number,
        required: true
      }
    }],
    calculatedPartScore: {
      type: Number,
      required: true
    }
  }],
  finalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['passed', 'failed'],
    required: true
  },
  feedbackSummary: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  retryAllowed: {
    type: Boolean,
    default: false
  },
  isLatestAttempt: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
evaluationAttemptSchema.index({ project: 1, student: 1, attemptNumber: -1 });
evaluationAttemptSchema.index({ submission: 1 });
evaluationAttemptSchema.index({ student: 1, isLatestAttempt: 1 });

module.exports = mongoose.model('EvaluationAttempt', evaluationAttemptSchema);
