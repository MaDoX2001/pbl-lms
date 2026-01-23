const mongoose = require('mongoose');

const observationCardSchema = new mongoose.Schema({
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
  // For individual_oral phase: role-specific criteria marking
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
      applicableRoles: {
        type: [String],
        enum: ['all', 'system_designer', 'hardware_engineer', 'programmer'],
        default: ['all']
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
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate that section weights sum to 100%
observationCardSchema.pre('save', function(next) {
  const sectionTotal = this.sections.reduce((sum, section) => sum + section.weight, 0);
  if (Math.abs(sectionTotal - 100) > 0.01) {
    return next(new Error('Section weights must sum to 100%'));
  }
  next();
});

// Index for efficient queries
observationCardSchema.index({ project: 1, phase: 1 });

module.exports = mongoose.model('ObservationCard', observationCardSchema);
