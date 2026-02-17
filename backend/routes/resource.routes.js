const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  uploadCourseMaterial,
  getCourseMaterials,
  deleteCourseMaterial,
  createAssignment,
  getAssignments,
  deleteAssignment,
  uploadSupportResource,
  getSupportResources,
  getSupportResource,
  deleteSupportResource,
  rateSupportResource
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
router.delete('/:projectId/materials/:materialId', protect, deleteCourseMaterial);

// Assignment routes
router.post('/:projectId/assignments', protect, createAssignment);
router.get('/:projectId/assignments', protect, getAssignments);
router.delete('/:projectId/assignments/:assignmentId', protect, deleteAssignment);

// ============================================================================
// SUPPORT RESOURCES ROUTES (المصادر التعليمية العامة)
// ============================================================================

// Upload support resource - teachers and admins only
router.post('/support/upload', protect, authorize('teacher', 'admin'), upload.single('file'), uploadSupportResource);

// Get all support resources - public access
router.get('/support', getSupportResources);

// Get specific support resource - increment views
router.get('/support/:id', getSupportResource);

// Delete own support resource
router.delete('/support/:id', protect, deleteSupportResource);

// Rate a support resource
router.put('/support/:id/rate', protect, rateSupportResource);

module.exports = router;
