const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrUpdateObservationCard,
  getObservationCard,
  evaluateGroup,
  getGroupStatus,
  evaluateIndividual,
  getIndividualStatus,
  finalizeEvaluation,
  getFinalEvaluation,
  getAllFinalEvaluations,
  allowRetry,
  getStudentAttempts,
  getStudentLevel,
  getStudentBadges,
  createOrUpdateBadge,
  getProjectBadge
} = require('../controllers/assessment.controller');

// ============================================================================
// OBSERVATION CARD ROUTES
// ============================================================================
router.post('/observation-card', protect, authorize('teacher', 'admin'), createOrUpdateObservationCard);
router.get('/observation-card/:projectId/:phase', protect, getObservationCard);

// ============================================================================
// PHASE 1: GROUP ASSESSMENT ROUTES
// ============================================================================
router.post('/evaluate-group', protect, authorize('teacher', 'admin'), evaluateGroup);
router.get('/group-status/:projectId/:teamId', protect, getGroupStatus);

// ============================================================================
// PHASE 2: INDIVIDUAL + ORAL ASSESSMENT ROUTES
// ============================================================================
router.post('/evaluate-individual', protect, authorize('teacher', 'admin'), evaluateIndividual);
router.get('/individual-status/:projectId/:studentId', protect, getIndividualStatus);

// ============================================================================
// FINAL EVALUATION ROUTES
// ============================================================================
router.post('/finalize', protect, authorize('teacher', 'admin'), finalizeEvaluation);
router.get('/final/:projectId/:studentId', protect, getFinalEvaluation);
router.get('/final-all/:projectId', protect, authorize('teacher', 'admin'), getAllFinalEvaluations);

// ============================================================================
// RETRY MANAGEMENT ROUTES
// ============================================================================
router.post('/allow-retry', protect, authorize('teacher', 'admin'), allowRetry);
router.get('/attempts/:projectId/:studentId', protect, getStudentAttempts);

// ============================================================================
// STUDENT LEVEL & BADGES ROUTES
// ============================================================================
router.get('/student-level/:studentId', protect, getStudentLevel);
router.get('/badges/:studentId', protect, getStudentBadges);

// Badge management
router.post('/badge', protect, authorize('teacher', 'admin'), createOrUpdateBadge);
router.get('/badge/:projectId', protect, getProjectBadge);

module.exports = router;
