const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrUpdateObservationCard,
  updateObservationCard,
  getObservationCardByPhase,
  getObservationCard,
  evaluateGroup,
  getGroupStatus,
  evaluateIndividual,
  getIndividualStatus,
  generateAIEvaluationDraft,
  finalizeEvaluation,
  getFinalEvaluation,
  getAllFinalEvaluations,
  allowRetry,
  getStudentAttempts,
  getStudentLevel,
  getStudentBadges,
  createOrUpdateBadge,
  getProjectBadge,
  getEvaluation
} = require('../controllers/assessment.controller');

// ============================================================================
// OBSERVATION CARD ROUTES
// ============================================================================
router.post('/observation-card', protect, authorize('teacher', 'admin'), createOrUpdateObservationCard);
router.put('/observation-card/:cardId', protect, authorize('teacher', 'admin'), updateObservationCard);
router.get('/observation-card/:projectId/:phase', protect, getObservationCardByPhase);
router.get('/observation-card/:projectId', protect, getObservationCard);

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
router.post('/ai-evaluate-individual', protect, authorize('teacher', 'admin'), generateAIEvaluationDraft);

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
router.get('/evaluation/:submissionId', protect, getEvaluation);

// ============================================================================
// STUDENT LEVEL & BADGES ROUTES
// ============================================================================
router.get('/student-level/:studentId', protect, getStudentLevel);
router.get('/badges/:studentId', protect, getStudentBadges);

// Badge management
router.post('/badge', protect, authorize('teacher', 'admin'), createOrUpdateBadge);
router.get('/badge/:projectId', protect, getProjectBadge);

module.exports = router;
