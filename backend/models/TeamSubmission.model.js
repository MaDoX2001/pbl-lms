const mongoose = require('mongoose');

/**
 * TeamSubmission Model
 * 
 * Represents a team's submission for a project.
 * - Each project allows MULTIPLE submissions
 * - Old submissions are NEVER overwritten
 * - Submissions belong to teams, not individual users
 * - Teachers/Admins can add feedback and score
 */
const teamSubmissionSchema = new mongoose.Schema({
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
  
  // File upload URL (stored in cloud or local)
  fileUrl: {
    type: String,
    required: [true, 'ملف التسليم مطلوب']
  },
  
  // Original filename
  fileName: {
    type: String,
    required: true
  },
  
  // Optional description from team
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'الوصف يجب ألا يتجاوز 1000 حرف']
  },
  
  // Which team member uploaded
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Submission date/time
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Feedback from teacher/admin (can be updated multiple times)
  feedback: {
    type: String,
    trim: true
  },
  
  // Who gave feedback
  feedbackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // When feedback was given
  feedbackAt: {
    type: Date
  },
  
  // Score/evaluation (nullable until graded)
  score: {
    type: Number,
    min: [0, 'الدرجة لا يمكن أن تكون أقل من 0'],
    max: [100, 'الدرجة لا يمكن أن تتجاوز 100'],
    default: null
  },
  
  // Who graded
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // When graded
  gradedAt: {
    type: Date
  },
  
  // Status: pending, reviewed, graded
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'graded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
teamSubmissionSchema.index({ team: 1, project: 1 });
teamSubmissionSchema.index({ project: 1 });
teamSubmissionSchema.index({ team: 1 });
teamSubmissionSchema.index({ status: 1 });
teamSubmissionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('TeamSubmission', teamSubmissionSchema);
