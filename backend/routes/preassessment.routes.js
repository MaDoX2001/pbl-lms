const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getQuestions,
  submitPreAssessment
} = require('../controllers/preassessment.controller');

// Get pre-assessment questions
router.get('/questions', protect, getQuestions);

// Submit pre-assessment
router.post('/submit', protect, submitPreAssessment);

module.exports = router;
