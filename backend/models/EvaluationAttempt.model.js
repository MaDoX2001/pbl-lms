const mongoose = require('mongoose');

const evaluationAttemptSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  phase: {
    type: String,
    enum: ['group', 'individual_oral'],
    required: true
  },
  // For group phase: team reference
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  // For individual phase: student reference
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For individual phase: selected student role
  studentRole: {
    type: String,
    enum: ['system_designer', 'hardware_engineer', 'programmer']
  },
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
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
      isRequired: {
        type: Boolean,
        default: true
      },
      selectedPercentage: {
        type: Number,
        enum: [0, 20, 40, 60, 80, 100]
      },
      selectedDescription: {
        type: String
      }
    }],
    calculatedSectionScore: {
      type: Number,
      required: true
    }
  }],
  calculatedScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
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
evaluationAttemptSchema.index({ project: 1, phase: 1, team: 1, attemptNumber: -1 });
evaluationAttemptSchema.index({ project: 1, phase: 1, student: 1, attemptNumber: -1 });
evaluationAttemptSchema.index({ submission: 1 });
evaluationAttemptSchema.index({ student: 1, isLatestAttempt: 1 });
evaluationAttemptSchema.index({ team: 1, phase: 1, isLatestAttempt: 1 });

module.exports = mongoose.model('EvaluationAttempt', evaluationAttemptSchema);
