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
  uploadMiddleware
} = require('../controllers/teamSubmission.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * TeamSubmission Routes
 * All routes require authentication
 */

// Create submission (with file upload)
router.post('/', protect, uploadMiddleware, createSubmission);

// Get all submissions for a specific team's project
router.get('/team/:teamId/project/:projectId', protect, getTeamProjectSubmissions);

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
