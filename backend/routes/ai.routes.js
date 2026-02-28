const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/ai/chat - authenticated users only
router.post('/chat', protect, chat);

module.exports = router;
