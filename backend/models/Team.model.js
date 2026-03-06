const mongoose = require('mongoose');

/**
 * Team Model
 * 
 * Represents a team of 2-4 students for PBL activities.
 * Teams are created and managed by ADMIN only.
 * A student can belong to ONLY ONE team at a time.
 *
 * Roles:
 *  - system_designer  : يصمم المشروع كفكرة وآلية عمله
 *  - hardware_engineer: يعمل التوصيلات على البورد
 *  - tester          : يجرب المشروع ويرصد المشكلات
 *  - unassigned      : لم يتم تحديد الدور بعد (افتراضي)
 */
const TEAM_ROLES = ['system_designer', 'hardware_engineer', 'tester', 'unassigned'];

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الفريق مطلوب'],
    unique: true,
    trim: true,
    minlength: [3, 'اسم الفريق يجب أن يكون 3 أحرف على الأقل']
  },

  // 2-4 students — each with an optional role
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: TEAM_ROLES,
      default: 'unassigned'
    }
  }],

  // Admin/Teacher who created the team
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Optional description
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'الوصف يجب ألا يتجاوز 500 حرف']
  },

  // Active status (for future soft-delete support)
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validation: Team must have 2-4 members
teamSchema.pre('save', function(next) {
  if (this.members.length < 2 || this.members.length > 4) {
    return next(new Error('الفريق يجب أن يحتوي على 2 إلى 4 أعضاء'));
  }
  next();
});

// Helper: extract plain user ObjectIds from members array (works whether populated or not)
teamSchema.methods.getMemberIds = function() {
  return this.members.map(m => m.user?._id || m.user);
};

// Index for faster queries
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ createdBy: 1 });
teamSchema.index({ isActive: 1 });

module.exports = mongoose.model('Team', teamSchema);
