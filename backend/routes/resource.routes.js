const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const {
  uploadCourseMaterial,
  getCourseMaterials,
  deleteCourseMaterial,
  downloadCourseMaterial,
  createAssignment,
  getAssignments,
  deleteAssignment
} = require('../controllers/resource.controller');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Course materials routes
router.post('/:projectId/materials', protect, upload.single('file'), uploadCourseMaterial);
router.get('/:projectId/materials', protect, getCourseMaterials);
router.get('/download/:projectId/:materialId', protect, downloadCourseMaterial);
router.delete('/:projectId/materials/:materialId', protect, deleteCourseMaterial);

// Assignment routes
router.post('/:projectId/assignments', protect, createAssignment);
router.get('/:projectId/assignments', protect, getAssignments);
router.delete('/:projectId/assignments/:assignmentId', protect, deleteAssignment);

module.exports = router;
