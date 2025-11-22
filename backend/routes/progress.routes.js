const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getProgress,
  getStudentProgress,
  updateMilestone,
  submitProject,
  reviewSubmission,
  getProjectSubmissions
} = require('../controllers/progress.controller');

// Student routes
router.get('/:projectId', protect, getProgress);
router.get('/student/:studentId', protect, getStudentProgress);
router.put('/:projectId/milestone/:milestoneId', protect, authorize('student'), updateMilestone);
router.post('/:projectId/submit', protect, authorize('student'), submitProject);

// Teacher/Admin routes
router.put('/:progressId/review', protect, authorize('teacher', 'admin'), reviewSubmission);
router.get('/project/:projectId/submissions', protect, authorize('teacher', 'admin'), getProjectSubmissions);

module.exports = router;
