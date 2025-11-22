const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'عنوان النقاش مطلوب'],
    trim: true,
    maxlength: [200, 'العنوان لا يمكن أن يتجاوز 200 حرف']
  },
  content: {
    type: String,
    required: [true, 'محتوى النقاش مطلوب'],
    maxlength: [2000, 'المحتوى لا يمكن أن يتجاوز 2000 حرف']
  },
  type: {
    type: String,
    enum: ['question', 'discussion', 'showcase', 'help'],
    default: 'discussion'
  },
  tags: [{
    type: String
  }],
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'الرد لا يمكن أن يتجاوز 1000 حرف']
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isAccepted: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  hasAcceptedAnswer: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
discussionSchema.index({ project: 1, createdAt: -1 });
discussionSchema.index({ author: 1 });
discussionSchema.index({ type: 1 });

module.exports = mongoose.model('Discussion', discussionSchema);
