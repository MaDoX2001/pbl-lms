const mongoose = require('mongoose');

const observationCardSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  phase: {
    type: String,
    // group          : تقييم جماعي للفريق ككل
    // individual_oral: تقييم فردي (للتوافق مع النسخ القديمة)
    // role_designer  : كارت خاص بدور مصمم النظام
    // role_hardware  : كارت خاص بدور مهندس التوصيلات
    // role_tester    : كارت خاص بدور المختبِر
    // role_programming: كارت البرمجة المشترك (يُقيَّم لكل عضو فردياً)
    enum: ['group', 'individual_oral', 'role_designer', 'role_hardware', 'role_tester', 'role_programming'],
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
          enum: [0, 50, 100]
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
