const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Type: direct (1-on-1) or group
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true,
    default: 'direct'
  },
  
  // Group name (only for group chats)
  name: {
    type: String,
    trim: true
  },
  
  // Group avatar (only for group chats)
  avatar: {
    type: String
  },
  
  // Participants in the conversation
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Group admin (only for group chats)
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Last message info for quick display
  lastMessage: {
    text: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  
  // Unread count per user
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Method to check if user is participant
conversationSchema.methods.hasParticipant = function(userId) {
  return this.participants.some(p => p.toString() === userId.toString());
};

module.exports = mongoose.model('Conversation', conversationSchema);
