const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  enrollProject,
  updateProjectCover
} = require('../controllers/project.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 * 1024 } });

// Public routes
router.get('/', getAllProjects);
router.get('/:id', getProject);

// Protected routes
router.post('/', protect, authorize('teacher', 'admin'), createProject);
router.put('/:id', protect, authorize('teacher', 'admin'), updateProject);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteProject);

// Update project cover image
router.put(
  '/:id/cover',
  protect,
  authorize('teacher', 'admin'),
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  updateProjectCover
);

// Student enrollment
router.post('/:id/enroll', protect, authorize('student'), enrollProject);

module.exports = router;
