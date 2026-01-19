const express = require('express');
const router = express.Router();
const {
  enrollTeam,
  getTeamProjects,
  getProjectTeams,
  unenrollTeam
} = require('../controllers/teamProject.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * TeamProject Routes (Enrollment)
 * All routes require authentication
 */

// Enroll team in project
router.post('/enroll', protect, enrollTeam);

// Get all projects for a team
router.get('/team/:teamId', protect, getTeamProjects);

// Get all teams enrolled in a project
router.get('/project/:projectId', protect, getProjectTeams);

// Unenroll team from project
router.delete('/:id', protect, unenrollTeam);

module.exports = router;
