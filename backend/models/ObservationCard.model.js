const mongoose = require('mongoose');

const observationCardSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assessmentParts: [{
    name: {
      type: String,
      required: true,
      enum: ['project_evaluation', 'individual_evaluation', 'oral_evaluation']
    },
    displayName: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 33.33
    },
    sections: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      weight: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      criteria: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        options: [{
          percentage: {
            type: Number,
            required: true,
            enum: [0, 20, 40, 60, 80, 100]
          },
          description: {
            type: String,
            required: true,
            trim: true
          }
        }]
      }]
    }]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate that assessment part weights sum to 100%
observationCardSchema.pre('save', function(next) {
  const totalWeight = this.assessmentParts.reduce((sum, part) => sum + part.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return next(new Error('Assessment part weights must sum to 100%'));
  }
  
  // Validate that section weights within each part sum to 100%
  for (const part of this.assessmentParts) {
    const sectionTotal = part.sections.reduce((sum, section) => sum + section.weight, 0);
    if (Math.abs(sectionTotal - 100) > 0.01) {
      return next(new Error(`Section weights in ${part.displayName} must sum to 100%`));
    }
  }
  
  next();
});

module.exports = mongoose.model('ObservationCard', observationCardSchema);
