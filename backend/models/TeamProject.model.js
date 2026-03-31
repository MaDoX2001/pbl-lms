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
  },

  // Per-project role assignments — each member picks their role for this specific project
  memberRoles: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['system_designer', 'hardware_engineer', 'tester'],
      required: true
    }
  }],

  // Active editor: who is currently working on the simulator (expires after 10 min)
  activeEditor: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    activeSince: { type: Date, default: null }
  },

  // Retry allowed by teacher for this team on this project
  retryAllowed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// Compound unique index: A team can only enroll in a project once
teamProjectSchema.index({ team: 1, project: 1 }, { unique: true });

// Index for queries
teamProjectSchema.index({ team: 1 });
teamProjectSchema.index({ project: 1 });

module.exports = mongoose.model('TeamProject', teamProjectSchema);
