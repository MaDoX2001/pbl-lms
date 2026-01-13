const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUsers
} = require('../controllers/chat.controller');

// All routes require authentication
router.use(protect);

// Get all conversations
router.get('/conversations', getConversations);

// Get or create direct conversation
router.post('/conversations/direct', getOrCreateDirectConversation);

// Create group conversation (teacher/admin only)
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
