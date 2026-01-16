const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  getAllLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture
} = require('../controllers/lecture.controller');

// Public routes
router.get('/', protect, getAllLectures);
router.get('/:id', protect, getLectureById);

// Teacher/Admin only routes
router.post('/', protect, authorize('teacher', 'admin'), createLecture);
router.put('/:id', protect, authorize('teacher', 'admin'), updateLecture);
router.delete('/:id', protect, authorize('teacher', 'admin'), deleteLecture);

module.exports = router;
