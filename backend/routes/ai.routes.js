const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { chat, getHistory, clearHistory, summarize, saveSummary, getSummary } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// Per-user rate limiter: max 10 chat requests per minute per authenticated user.
// Keyed by user._id so one user can't exhaust the Gemini quota for everyone else.
// protect must run first so req.user is available for keyGenerator.
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'طلبات كثيرة جداً، انتظر دقيقة ثم حاول.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

// POST /api/ai/chat - authenticated users (per-user rate limited)
router.post('/chat', protect, aiChatLimiter, chat);

// POST /api/ai/summarize - all authenticated users (background summarization)
router.post('/summarize', protect, summarize);

// POST /api/ai/summary/save - save cumulative summary to DB (admin)
router.post('/summary/save', protect, saveSummary);

// GET  /api/ai/summary - all authenticated users (returns only the rolling summary)
router.get('/summary', protect, getSummary);

// GET  /api/ai/history - all authenticated users (DB-persisted chat + summary)
router.get('/history', protect, getHistory);

// DELETE /api/ai/history - all authenticated users (clears messages + summary)
router.delete('/history', protect, clearHistory);

module.exports = router;
