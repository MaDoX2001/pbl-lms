const mongoose = require('mongoose');

const preAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  dimensionScores: {
    technicalReadiness: { type: Number, min: 0, max: 100 },
    programmingReadiness: { type: Number, min: 0, max: 100 },
    arduinoReadiness: { type: Number, min: 0, max: 100 },
    smartSystemsReadiness: { type: Number, min: 0, max: 100 },
    projectLearningReadiness: { type: Number, min: 0, max: 100 }
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  readinessLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PreAssessment', preAssessmentSchema);
