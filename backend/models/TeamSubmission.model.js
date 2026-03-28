const mongoose = require('mongoose');

/**
 * TeamSubmission Model
 *
 * Supports two submission types:
 * - 'file'  : traditional file upload (fileUrl required)
 * - 'wokwi' : Arduino simulator link submission (wokwiLink required)
 *
 * Old submissions are NEVER overwritten — full history is kept.
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

  stageKey: {
    type: String,
    enum: ['design', 'wiring', 'programming', 'testing', 'final_delivery'],
    required: true,
    default: 'design'
  },

  // Type: 'file' or 'wokwi'
  submissionType: {
    type: String,
    enum: ['file', 'wokwi'],
    default: 'file'
  },

  // ---- File submission fields (submissionType = 'file') ----
  fileUrl: { type: String },
  fileName: { type: String },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'الوصف يجب ألا يتجاوز 1000 حرف']
  },

  // ---- Wokwi submission fields (submissionType = 'wokwi') ----
  wokwiLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https:\/\/wokwi\.com\/projects\/[a-zA-Z0-9_-]+/.test(v);
      },
      message: 'رابط Wokwi غير صالح — يجب أن يكون بصيغة https://wokwi.com/projects/XXXXX'
    }
  },

  // Notes from student about what changed in this version
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'الملاحظات يجب ألا تتجاوز 500 حرف']
  },

  // Teammate acknowledgement for the latest handed-off Wokwi version
  handoffAcceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  handoffAcceptedAt: {
    type: Date,
    default: null
  },

  // ---- Common fields ----
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  submittedAt: {
    type: Date,
    default: Date.now
  },

  feedback: { type: String, trim: true },
  feedbackBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feedbackAt: { type: Date },

  score: {
    type: Number,
    min: [0, 'الدرجة لا يمكن أن تكون أقل من 0'],
    max: [100, 'الدرجة لا يمكن أن تتجاوز 100'],
    default: null
  },

  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },

  status: {
    type: String,
    enum: ['pending', 'reviewed', 'graded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Custom validator: fileUrl required for 'file' type, wokwiLink required for 'wokwi' type
teamSubmissionSchema.pre('validate', function(next) {
  if (this.submissionType === 'file' && !this.fileUrl) {
    this.invalidate('fileUrl', 'ملف التسليم مطلوب عند نوع التسليم "file"');
  }
  if (this.submissionType === 'wokwi' && !this.wokwiLink) {
    this.invalidate('wokwiLink', 'رابط Wokwi مطلوب عند نوع التسليم "wokwi"');
  }
  next();
});

teamSubmissionSchema.index({ team: 1, project: 1 });
teamSubmissionSchema.index({ project: 1 });
teamSubmissionSchema.index({ team: 1 });
teamSubmissionSchema.index({ status: 1 });
teamSubmissionSchema.index({ submittedAt: -1 });
teamSubmissionSchema.index({ team: 1, project: 1, submissionType: 1, submittedAt: -1 });
teamSubmissionSchema.index({ team: 1, project: 1, createdAt: -1 });
teamSubmissionSchema.index({ team: 1, project: 1, stageKey: 1, submittedAt: -1 });

module.exports = mongoose.model('TeamSubmission', teamSubmissionSchema);
