const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation this message belongs to
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  
  // Sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  content: {
    type: String,
    default: '',
    trim: true
  },

  // Reply metadata (message this one replies to)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  // Forward metadata
  forwardedFrom: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    }
  },
  
  // Message type
  type: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text'
  },
  
  // File attachment (if type is 'file' or 'image')
  attachment: {
    url: String,
    publicId: String,
    fileName: String,
    fileType: String,
    fileSize: Number
  },
  
  // Read by users
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Deleted for users (soft delete)
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Message lifecycle flags
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster message retrieval
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
