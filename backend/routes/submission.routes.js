const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const {
  submitHomework,
  getAssignmentSubmissions,
  getMySubmissions,
  gradeSubmission,
  deleteSubmission,
  downloadSubmission
} = require('../controllers/submission.controller');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max for student submissions
  }
});

// Student submission routes
router.post('/projects/:projectId/assignments/:assignmentId/submit', protect, upload.single('file'), submitHomework);
router.get('/projects/:projectId/my-submissions', protect, getMySubmissions);

// Teacher/Admin routes
router.get('/projects/:projectId/assignments/:assignmentId/submissions', protect, getAssignmentSubmissions);
router.put('/:submissionId/grade', protect, gradeSubmission);
router.delete('/:submissionId', protect, deleteSubmission);

// Download route (student, teacher, admin)
router.get('/:submissionId/download', protect, downloadSubmission);

module.exports = router;
