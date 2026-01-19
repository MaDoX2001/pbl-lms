const express = require('express');
const router = express.Router();
const {
  createTeam,
  getAllTeams,
  getTeamById,
  getMyTeam,
  updateTeam,
  deleteTeam
} = require('../controllers/team.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * Team Routes
 * All routes require authentication
 */

// Get my team (for students)
router.get('/my-team', protect, getMyTeam);

// Get all teams / Create team
router.route('/')
  .get(protect, getAllTeams)      // Teacher/Admin only
  .post(protect, createTeam);     // Admin only

// Get/Update/Delete specific team
router.route('/:id')
  .get(protect, getTeamById)      // Team member, Teacher, Admin
  .put(protect, updateTeam)       // Admin only
  .delete(protect, deleteTeam);   // Admin only

module.exports = router;
