const express = require('express');
const router = express.Router();
const { chat, getHistory, clearHistory, summarize, saveSummary } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/ai/chat - authenticated users
router.post('/chat', protect, chat);

// POST /api/ai/summarize - all authenticated users (background summarization)
router.post('/summarize', protect, summarize);

// POST /api/ai/summary/save - save cumulative summary to DB (admin)
router.post('/summary/save', protect, saveSummary);

// GET  /api/ai/history - admin only (DB-persisted chat + summary)
router.get('/history', protect, getHistory);

// DELETE /api/ai/history - admin only (clears messages + summary)
router.delete('/history', protect, clearHistory);

module.exports = router;
