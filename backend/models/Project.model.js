const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'العنوان لا يمكن أن يتجاوز 100 حرف']
  },
  description: {
    type: String,
    maxlength: [2000, 'الوصف لا يمكن أن يتجاوز 2000 حرف']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'الوصف المختصر لا يمكن أن يتجاوز 200 حرف']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  category: {
    type: String,
    enum: ['web', 'mobile', 'desktop', 'data-science', 'ai-ml', 'game-dev', 'other'],
    default: 'web'
  },
  technologies: [{
    type: String
  }],
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced']
    }
  }],
  objectives: [{
    type: String
  }],
  milestones: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    order: {
      type: Number,
      required: true
    },
    tasks: [{
      title: String,
      description: String,
      completed: {
        type: Boolean,
        default: false
      }
    }],
    points: {
      type: Number,
      default: 0
    }
  }],
  estimatedDuration: {
    type: Number // بالساعات
  },
  deadline: {
    type: Date,
    required: false
  },
  learningScenario: {
    type: String,
    maxlength: [1500, 'السيناريو التعليمي لا يمكن أن يتجاوز 1500 حرف']
  },
  teachingStrategy: {
    type: String,
    maxlength: [500, 'الاستراتيجية التعليمية لا يمكن أن تتجاوز 500 حرف']
  },
  finalReportNote: {
    type: String,
    maxlength: [500, 'ملاحظة التقرير النهائي لا يمكن أن تتجاوز 500 حرف']
  },
  abcdModel: {
    audience: {
      type: String,
      maxlength: [500, 'الجمهور المستهدف لا يمكن أن يتجاوز 500 حرف']
    },
    behavior: {
      type: String,
      maxlength: [500, 'السلوك المتوقع لا يمكن أن يتجاوز 500 حرف']
    },
    condition: {
      type: String,
      maxlength: [500, 'الظروف لا يمكن أن يتجاوز 500 حرف']
    },
    degree: {
      type: String,
      maxlength: [500, 'الدرجة المطلوبة لا يمكن أن يتجاوز 500 حرف']
    }
  },
  points: {
    type: Number,
    default: 100
  },
  resources: [{
    type: {
      type: String,
      enum: ['video', 'article', 'documentation', 'tutorial', 'github']
    },
    title: String,
    url: String,
    description: String
  }],
  courseMaterials: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    fileType: {
      type: String,
      enum: ['video', 'pdf', 'document', 'image', 'zip', 'other'],
      required: true
    },
    cloudinaryId: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw'],
      default: 'raw'
    },
    size: Number, // in bytes
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignments: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    maxScore: {
      type: Number,
      default: 100
    },
    allowedFileTypes: [String], // e.g., ['pdf', 'zip', 'docx']
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB in bytes
    },
    allowLateSubmission: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  starterCode: {
    type: String,
    default: ''
  },
  solution: {
    type: String,
    select: false // لا يتم عرضه للطلاب
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  coverImage: {
    type: String,
    default: ''
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  completedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  teamsLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'رابط Teams غير صالح'
    }
  },
  tags: [{
    type: String
  }],
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
projectSchema.index({ difficulty: 1, category: 1 });
projectSchema.index({ instructor: 1 });
projectSchema.index({ isPublished: 1 });
projectSchema.index({ 'rating.average': -1 });

module.exports = mongoose.model('Project', projectSchema);
