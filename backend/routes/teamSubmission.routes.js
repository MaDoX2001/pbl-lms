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
  getStageProgress
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
router.post('/wokwi', protect, submitWokwiLink);

// Get ONLY the latest Wokwi submission (most efficient for page load)
router.get('/wokwi/:teamId/:projectId/latest', protect, getLatestWokwiSubmission);

// Get Wokwi submission history for a team's project
router.get('/wokwi/:teamId/:projectId', protect, getWokwiHistory);

// Get all submissions for a specific team's project
router.get('/team/:teamId/project/:projectId', protect, getTeamProjectSubmissions);

// Get stage progress (completion + programming per-member counts)
router.get('/progress/:teamId/:projectId', protect, getStageProgress);

// Get all submissions for a project (all teams) - Teacher/Admin
router.get('/project/:projectId', protect, getProjectSubmissions);

// Get/Delete specific submission
router.route('/:id')
  .get(protect, getSubmissionById)
  .delete(protect, deleteSubmission);  // Admin only

// Add/Update feedback
router.put('/:id/feedback', protect, addFeedback);

// Add/Update grade
router.put('/:id/grade', protect, addGrade);

module.exports = router;
