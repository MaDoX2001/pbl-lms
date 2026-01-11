const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
  sendInvitation,
  getAllInvitations,
  deleteInvitation,
  getDashboardStats
} = require('../controllers/admin.controller');
const {
  getPendingUsers,
  approveUser,
  rejectUser
} = require('../controllers/publicRegister.controller');

// Protect all routes and require admin role
router.use(protect);
router.use(adminOnly);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Invitation management
router.post('/invitations', sendInvitation);
router.get('/invitations', getAllInvitations);
router.delete('/invitations/:id', deleteInvitation);

// Dashboard stats
router.get('/stats', getDashboardStats);

// User Approval
router.get('/pending-users', getPendingUsers);
router.put('/approve-user/:id', approveUser);
router.put('/reject-user/:id', rejectUser);

module.exports = router;

module.exports = router;
