const express = require('express');
const router = express.Router();
const {
  createTeam,
  getAllTeams,
  getTeamById,
  getMyTeam,
  updateTeam,
  deleteTeam,
  setMyRole
} = require('../controllers/team.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * Team Routes
 * All routes require authentication
 * Teachers and Admins have full team management access
 */

// Get my team (for students)
router.get('/my-team', protect, getMyTeam);

// Set my role within the team (student selects: system_designer | hardware_engineer | tester)
router.put('/my-team/role', protect, setMyRole);

// Get all teams / Create team
router.route('/')
  .get(protect, getAllTeams)      // Teacher/Admin
  .post(protect, createTeam);     // Teacher/Admin

// Get/Update/Delete specific team
router.route('/:id')
  .get(protect, getTeamById)      // Team member, Teacher, Admin
  .put(protect, updateTeam)       // Teacher/Admin
  .delete(protect, deleteTeam);   // Teacher/Admin

module.exports = router;
