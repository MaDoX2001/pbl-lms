const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Type: direct (1-to-1), team, team_teachers, general
  type: {
    type: String,
    enum: ['direct', 'team', 'team_teachers', 'general'],
    required: true,
    default: 'direct'
  },
  
  // Group/conversation name
  name: {
    type: String,
    trim: true
  },
  
  // Avatar for conversation
  avatar: {
    type: String
  },
  
  // Reference to team (for team and team_teachers types)
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  
  // Participants in the conversation
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Conversation admin (for team_teachers, general)
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
