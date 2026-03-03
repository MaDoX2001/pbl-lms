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
  rateSupportResource,
  downloadSupportResource,
  updateSupportResourceThumbnail
} = require('../controllers/resource.controller');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB max for teacher/admin uploads
  }
});

// Course materials routes
router.post(
  '/:projectId/materials',
  protect,
  authorize('teacher', 'admin'),
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  uploadCourseMaterial
);
router.get('/:projectId/materials', protect, getCourseMaterials);
router.delete('/:projectId/materials/:materialId', protect, authorize('teacher', 'admin'), deleteCourseMaterial);

// Assignment routes
router.post('/:projectId/assignments', protect, authorize('teacher', 'admin'), createAssignment);
router.get('/:projectId/assignments', protect, getAssignments);
router.delete('/:projectId/assignments/:assignmentId', protect, authorize('teacher', 'admin'), deleteAssignment);

// ============================================================================
// SUPPORT RESOURCES ROUTES (المصادر التعليمية العامة)
// ============================================================================

// Upload support resource - teachers and admins only
router.post(
  '/support/upload',
  protect,
  authorize('teacher', 'admin'),
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  uploadSupportResource
);

// Get all support resources - public access
router.get('/support', getSupportResources);

// Get specific support resource - increment views
router.get('/support/:id', getSupportResource);

// Download support resource - increment downloads
router.put('/support/:id/download', downloadSupportResource);

// Delete own support resource
router.delete('/support/:id', protect, deleteSupportResource);

// Rate a support resource
router.put('/support/:id/rate', protect, rateSupportResource);

// Update thumbnail of an existing support resource
router.put(
  '/support/:id/thumbnail',
  protect,
  authorize('teacher', 'admin'),
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  updateSupportResourceThumbnail
);

module.exports = router;
