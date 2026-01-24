const mongoose = require('mongoose');

const finalEvaluationSchema = new mongoose.Schema({
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
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  groupEvaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationAttempt'
    // Optional - individual projects don't have group evaluation
  },
  individualEvaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationAttempt',
    required: true
  },
  groupScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  individualScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  finalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 200
  },
  finalPercentage: {
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
  verbalGrade: {
    type: String,
    enum: ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'غير مجتاز'],
    required: true
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Calculate verbal grade based on percentage
finalEvaluationSchema.methods.calculateVerbalGrade = function() {
  const percentage = this.finalPercentage;
  if (percentage >= 85) return 'ممتاز';
  if (percentage >= 75) return 'جيد جدًا';
  if (percentage >= 65) return 'جيد';
  if (percentage >= 60) return 'مقبول';
  return 'غير مجتاز';
};

// Index for efficient queries
finalEvaluationSchema.index({ project: 1, student: 1, isLatest: 1 });
finalEvaluationSchema.index({ student: 1, status: 1 });
finalEvaluationSchema.index({ project: 1, team: 1 });

module.exports = mongoose.model('FinalEvaluation', finalEvaluationSchema);
