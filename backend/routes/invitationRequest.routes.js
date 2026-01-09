const express = require('express');
const router = express.Router();
const {
  requestInvitation,
  getAllInvitationRequests,
  getInvitationRequest,
  approveInvitationRequest,
  rejectInvitationRequest,
  checkRequestStatus
} = require('../controllers/invitationRequest.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');

// Public routes
router.post('/request', requestInvitation);
router.get('/check-status', checkRequestStatus);

// Admin routes (protected)
router.get('/admin/all', protect, adminOnly, getAllInvitationRequests);
router.get('/admin/:id', protect, adminOnly, getInvitationRequest);
router.post('/admin/:id/approve', protect, adminOnly, approveInvitationRequest);
router.post('/admin/:id/reject', protect, adminOnly, rejectInvitationRequest);

module.exports = router;
