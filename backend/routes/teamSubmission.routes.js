const express = require('express');
const router = express.Router();
const {
  createSubmission,
  getTeamProjectSubmissions,
  getProjectSubmissions,
  getSubmissionById,
  addFeedback,
  addGrade,
  deleteSubmission,
  uploadMiddleware,
  uploadWokwiFilesMiddleware,
  getStageProgress,
  acknowledgeWokwiHandoff,
  castFinalDeliveryVote,
  clearProjectFeedback
} = require('../controllers/teamSubmission.controller');
const {
  submitWokwiLink,
  getWokwiHistory,
  getLatestWokwiSubmission,
} = require('../controllers/teamSubmission.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * TeamSubmission Routes
 * All routes require authentication
 */

// Create file submission (with file upload)
router.post('/', protect, uploadMiddleware, createSubmission);

// Submit a Wokwi simulator link  
router.post('/wokwi', protect, uploadWokwiFilesMiddleware, submitWokwiLink);

// Get ONLY the latest Wokwi submission (most efficient for page load)
router.get('/wokwi/:teamId/:projectId/latest', protect, getLatestWokwiSubmission);

// Get Wokwi submission history for a team's project
router.get('/wokwi/:teamId/:projectId', protect, getWokwiHistory);

// Team member acknowledges receiving a teammate Wokwi version
router.put('/:id/handoff-ack', protect, acknowledgeWokwiHandoff);

// Team member approves the final delivery
router.put('/:id/final-vote', protect, castFinalDeliveryVote);

// Get all submissions for a specific team's project
router.get('/team/:teamId/project/:projectId', protect, getTeamProjectSubmissions);

// Get stage progress (completion + programming per-member counts)
router.get('/progress/:teamId/:projectId', protect, getStageProgress);

// Get all submissions for a project (all teams) - Teacher/Admin
router.get('/project/:projectId', protect, getProjectSubmissions);

// Clear feedback for all submissions in a project - Teacher/Admin
router.delete('/project/:projectId/feedback', protect, clearProjectFeedback);

// Get/Delete specific submission
router.route('/:id')
  .get(protect, getSubmissionById)
  .delete(protect, deleteSubmission);  // Admin only

// Add/Update feedback
router.put('/:id/feedback', protect, addFeedback);

// Add/Update grade
router.put('/:id/grade', protect, addGrade);

module.exports = router;
