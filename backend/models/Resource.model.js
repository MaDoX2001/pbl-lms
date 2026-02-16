const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان المصدر مطلوب'],
    trim: true,
    maxlength: [150, 'العنوان لا يمكن أن يتجاوز 150 حرف']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'الوصف لا يمكن أن يتجاوز 500 حرف']
  },
  resourceType: {
    type: String,
    enum: ['image', 'video', 'pdf', 'document', 'link', 'other'],
    required: [true, 'نوع المصدر مطلوب']
  },
  fileUrl: {
    type: String,
    required: [true, 'رابط الملف مطلوب']
  },
  cloudinaryId: {
    type: String, // For uploaded files
    default: null
  },
  fileSize: {
    type: Number, // In bytes
    default: null
  },
  fileType: {
    type: String, // MIME type like 'image/png', 'application/pdf'
    default: null
  },
  thumbnail: {
    type: String, // Thumbnail URL for videos/documents
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: [
      'الإلكترونيات',
      'البرمجة',
      'الدوائر الكهربائية',
      'المحاكاة',
      'الأنظمة الذكية',
      'التعليمات والشروحات',
      'مراجع عامة',
      'أخرى'
    ],
    default: 'أخرى'
  },
  difficulty: {
    type: String,
    enum: ['مبتدئ', 'متوسط', 'متقدم'],
    default: 'متوسط'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false // Resources need admin approval before showing
  },
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
resourceSchema.index({ category: 1, resourceType: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ isApproved: 1, isPublished: 1 });
resourceSchema.index({ tags: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
