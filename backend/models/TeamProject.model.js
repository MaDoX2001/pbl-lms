const mongoose = require('mongoose');

/**
 * TeamProject Model (Join/Enrollment Model)
 * 
 * Represents a team's enrollment in a project.
 * Teams can enroll in multiple projects.
 * Enrollment is done باسم الفريق (team-based).
 */
const teamProjectSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'الفريق مطلوب']
  },
  
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'المشروع مطلوب']
  },
  
  // When the team enrolled
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  
  // Who enrolled the team (could be admin or team member)
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound unique index: A team can only enroll in a project once
teamProjectSchema.index({ team: 1, project: 1 }, { unique: true });

// Index for queries
teamProjectSchema.index({ team: 1 });
teamProjectSchema.index({ project: 1 });

module.exports = mongoose.model('TeamProject', teamProjectSchema);
