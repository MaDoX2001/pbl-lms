const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getProgress,
  getStudentProgress,
  updateMilestone,
  submitProject,
  reviewSubmission,
  getProjectSubmissions
} = require('../controllers/progress.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// Student routes
router.get('/:projectId', protect, getProgress);
router.get('/student/:studentId', protect, getStudentProgress);
router.put('/:projectId/milestone/:milestoneId', protect, authorize('student'), updateMilestone);
router.post(
  '/:projectId/submit',
  protect,
  authorize('student'),
  upload.fields([
    { name: 'wiringImage', maxCount: 1 },
    { name: 'submissionFile', maxCount: 1 }
  ]),
  submitProject
);

// Teacher/Admin routes
router.put('/:progressId/review', protect, authorize('teacher', 'admin'), reviewSubmission);
router.get('/project/:projectId/submissions', protect, authorize('teacher', 'admin'), getProjectSubmissions);

module.exports = router;
