const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrUpdateObservationCard,
  getObservationCard,
  createEvaluation,
  getEvaluation,
  getStudentAttempts,
  getStudentBadges,
  createOrUpdateBadge,
  getProjectBadge
} = require('../controllers/assessment.controller');

// Observation Card routes
router.post('/observation-card', protect, authorize('teacher', 'admin'), createOrUpdateObservationCard);
router.get('/observation-card/:projectId', protect, getObservationCard);

// Evaluation routes
router.post('/evaluate', protect, authorize('teacher', 'admin'), createEvaluation);
router.get('/evaluation/:submissionId', protect, getEvaluation);
router.get('/student-attempts/:projectId/:studentId', protect, getStudentAttempts);

// Badge routes
router.post('/badge', protect, authorize('teacher', 'admin'), createOrUpdateBadge);
router.get('/badge/:projectId', protect, getProjectBadge);
router.get('/badges/:studentId', protect, getStudentBadges);

module.exports = router;
