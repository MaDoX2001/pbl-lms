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

  // Optional attachments with Wokwi submission (images, pdf, docs, etc.)
  attachments: [{
    url: { type: String },
    publicId: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number }
  }],

  // Notes from student about what changed in this version
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'الملاحظات يجب ألا تتجاوز 500 حرف']
  },

  // Structured stage payloads (added on top of existing fields)
  stageInputs: {
    designNarrative: {
      type: String,
      trim: true,
      maxlength: [4000, 'وصف المصمم يجب ألا يتجاوز 4000 حرف']
    },
    wiringDiagramDetails: {
      type: String,
      trim: true,
      maxlength: [8000, 'تفاصيل مخطط التوصيل يجب ألا تتجاوز 8000 حرف']
    },
    programmingCode: {
      type: String,
      trim: true,
      maxlength: [40000, 'الكود البرمجي يجب ألا يتجاوز 40000 حرف']
    },
    testingReport: {
      type: String,
      trim: true,
      maxlength: [12000, 'تقرير الاختبار يجب ألا يتجاوز 12000 حرف']
    },
    finalAutoFill: {
      designNarrative: { type: String, trim: true, default: '' },
      wiringDiagramDetails: { type: String, trim: true, default: '' },
      programmingEntries: [
        {
          studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          studentName: { type: String, trim: true, default: '' },
          code: { type: String, trim: true, default: '' },
          sourceSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeamSubmission' }
        }
      ],
      testingReport: { type: String, trim: true, default: '' },
      sourceSubmissionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamSubmission' }],
      generatedAt: { type: Date }
    }
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

  // Final delivery approval votes from the three team members
  finalVotes: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],

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
