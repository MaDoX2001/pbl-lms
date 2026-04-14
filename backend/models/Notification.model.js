const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ai_evaluation', 'admin_message', 'system'],
    required: [true, 'نوع الإخطار مطلوب'],
    description: 'نوع الإخطار'
  },
  title: {
    type: String,
    required: [true, 'عنوان الإخطار مطلوب'],
    maxlength: [200, 'العنوان لا يمكن أن يتجاوز 200 حرف']
  },
  message: {
    type: String,
    required: [true, 'محتوى الإخطار مطلوب'],
    maxlength: [1000, 'المحتوى لا يمكن أن يتجاوز 1000 حرف']
  },
  relatedProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    description: 'المشروع المرتبط بالإخطار (إن وجد)'
  },
  relatedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'الطالب المرتبط بالإخطار (إن وجد)'
  },
  relatedEvaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EvaluationAttempt',
    description: 'محاولة التقييم المرتبطة بالإخطار (للتقييمات)'
  },
  relatedFinalEvaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinalEvaluation',
    description: 'التقييم النهائي المرتبط بالإخطار'
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المسؤول المستقبل مطلوب']
  },
  readAt: {
    type: Date,
    default: null,
    description: 'وقت قراءة الإخطار'
  },
  actionUrl: {
    type: String,
    description: 'رابط للانتقال إلى التفاصيل'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    description: 'درجة أهمية الإخطار'
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Index for efficient querying
notificationSchema.index({ admin: 1, createdAt: -1 });
notificationSchema.index({ admin: 1, readAt: 1 });

// Virtual to check if read
notificationSchema.virtual('isRead').get(function() {
  return this.readAt !== null;
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
