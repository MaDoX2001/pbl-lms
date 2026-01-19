const mongoose = require('mongoose');

/**
 * Team Model
 * 
 * Represents a team of 2-4 students for PBL activities.
 * Teams are created and managed by ADMIN only.
 * A student can belong to ONLY ONE team at a time.
 */
const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم الفريق مطلوب'],
    unique: true,
    trim: true,
    minlength: [3, 'اسم الفريق يجب أن يكون 3 أحرف على الأقل']
  },
  
  // 2-4 students
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Admin who created the team
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

// Index for faster queries
teamSchema.index({ members: 1 });
teamSchema.index({ createdBy: 1 });
teamSchema.index({ isActive: 1 });

module.exports = mongoose.model('Team', teamSchema);
