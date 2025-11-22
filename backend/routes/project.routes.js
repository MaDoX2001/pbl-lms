const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  enrollProject
} = require('../controllers/project.controller');

// Public routes
router.get('/', getAllProjects);
router.get('/:id', getProject);

// Protected routes
router.post('/', protect, authorize('teacher', 'admin'), createProject);
router.put('/:id', protect, authorize('teacher', 'admin'), updateProject);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteProject);

// Student enrollment
router.post('/:id/enroll', protect, authorize('student'), enrollProject);

module.exports = router;
