const TeamProject = require('../models/TeamProject.model');
const Team = require('../models/Team.model');
const Project = require('../models/Project.model');

/**
 * TeamProject Controller
 * 
 * Handles team enrollment in projects.
 * Teams can enroll in multiple projects.
 */

// @desc    Enroll team in a project
// @route   POST /api/team-projects/enroll
// @access  Private (team member or admin)
exports.enrollTeam = async (req, res) => {
  try {
    const { teamId, projectId } = req.body;

    // Validate inputs
    if (!teamId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الفريق والمشروع مطلوبان'
      });
    }

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود'
      });
    }

    // Access control: Only team members or admin can enroll
    if (req.user.role === 'student') {
      const isMember = team.members.some(
        member => member.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'فقط أعضاء الفريق يمكنهم التسجيل في المشروع'
        });
      }
    }

    // Check if already enrolled
    const existingEnrollment = await TeamProject.findOne({
      team: teamId,
      project: projectId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'الفريق مسجل بالفعل في هذا المشروع'
      });
    }

    // Create enrollment
    const enrollment = await TeamProject.create({
      team: teamId,
      project: projectId,
      enrolledBy: req.user._id
    });

    await enrollment.populate('team project');

    res.status(201).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تسجيل الفريق في المشروع',
      error: error.message
    });
  }
};

// @desc    Get all projects for a team
// @route   GET /api/team-projects/team/:teamId
// @access  Private (team member, teacher, admin)
exports.getTeamProjects = async (req, res) => {
  try {
    const { teamId } = req.params;

    // Check if team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Access control: Students can only see their team's projects
    if (req.user.role === 'student') {
      const isMember = team.members.some(
        member => member.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض مشاريع هذا الفريق'
        });
      }
    }

    const enrollments = await TeamProject.find({ team: teamId })
      .populate('project')
      .populate('enrolledBy', 'name')
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب مشاريع الفريق',
      error: error.message
    });
  }
};

// @desc    Get all teams enrolled in a project
// @route   GET /api/team-projects/project/:projectId
// @access  Teacher/Admin
exports.getProjectTeams = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض فرق المشروع'
      });
    }

    const { projectId } = req.params;

    const enrollments = await TeamProject.find({ project: projectId })
      .populate({
        path: 'team',
        populate: { path: 'members', select: 'name email' }
      })
      .populate('enrolledBy', 'name')
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب فرق المشروع',
      error: error.message
    });
  }
};

// @desc    Unenroll team from project
// @route   DELETE /api/team-projects/:id
// @access  Admin only
exports.unenrollTeam = async (req, res) => {
  try {
    // Validate: Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير يمكنه إلغاء تسجيل الفريق'
      });
    }

    const enrollment = await TeamProject.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'التسجيل غير موجود'
      });
    }

    await enrollment.deleteOne();

    res.json({
      success: true,
      message: 'تم إلغاء تسجيل الفريق بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إلغاء التسجيل',
      error: error.message
    });
  }
};
