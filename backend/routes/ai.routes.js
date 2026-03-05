const express = require('express');
const router = express.Router();
const { chat, getHistory, clearHistory } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/ai/chat - authenticated users only
router.post('/chat', protect, chat);

// GET  /api/ai/history - admin only (DB-persisted chat)
router.get('/history', protect, getHistory);

// DELETE /api/ai/history - admin only
router.delete('/history', protect, clearHistory);

module.exports = router;
