const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  getOrCreateTeamConversation,
  getOrCreateTeamTeachersConversation,
  getOrCreateGeneralConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUsers
} = require('../controllers/chat.controller');

// All routes require authentication
router.use(protect);

// Get all conversations (optionally filtered by type: ?type=direct|team|team_teachers|general)
router.get('/conversations', getConversations);

// Get or create direct conversation (1-to-1)
router.post('/conversations/direct', getOrCreateDirectConversation);

// Get or create team conversation (team members only)
router.post('/conversations/team', getOrCreateTeamConversation);

// Get or create team+teachers conversation (team members + all teachers)
router.post('/conversations/team-teachers', getOrCreateTeamTeachersConversation);

// Get or create general conversation (all platform users)
router.post('/conversations/general', getOrCreateGeneralConversation);

// Create group conversation (deprecated - kept for backward compatibility)
router.post('/conversations/group', authorize('teacher', 'admin'), createGroupConversation);

// Get messages for a conversation
router.get('/conversations/:id/messages', getMessages);

// Send message to a conversation
router.post('/conversations/:id/messages', sendMessage);

// Mark messages as read
router.put('/conversations/:id/read', markAsRead);

// Get users for starting conversations
router.get('/users', getUsers);

module.exports = router;
