const Team = require('../models/Team.model');
const TeamProject = require('../models/TeamProject.model');
const User = require('../models/User.model');

// Helper: checks if userId is a member of team (works before/after populate)
const isMemberOf = (team, userId) => {
  const id = userId.toString();
  return team.members.some(m => (m.user?._id || m.user || m).toString() === id);
};

// Helper: convert plain userId array to member sub-doc format
const toMemberDocs = (userIds) => userIds.map(id => ({ user: id, role: 'unassigned' }));

/**
 * Team Controller
 * 
 * Handles team creation, management, and queries.
 * ADMIN ONLY for creation and management.
 * Students can view their own team.
 * Teachers/Admins can view all teams.
 */

// @desc    Create a new team
// @route   POST /api/teams
// @access  Teacher/Admin
exports.createTeam = async (req, res) => {
  try {
    const { name, members, description } = req.body;

    // Validate: Teacher or Admin only
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'فقط المعلم أو المدير يمكنه إنشاء الفرق'
      });
    }

    // Validate: 2-4 members
    if (!members || members.length < 2 || members.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'الفريق يجب أن يحتوي على 2 إلى 4 أعضاء'
      });
    }

    // Validate: No duplicate members
    const uniqueMembers = [...new Set(members)];
    if (uniqueMembers.length !== members.length) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إضافة نفس الطالب أكثر من مرة'
      });
    }

    // Validate: All members exist and are students
    const users = await User.find({ _id: { $in: members } });
    if (users.length !== members.length) {
      return res.status(400).json({
        success: false,
        message: 'أحد الأعضاء غير موجود'
      });
    }

    const nonStudents = users.filter(u => u.role !== 'student');
    if (nonStudents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'جميع أعضاء الفريق يجب أن يكونوا طلاب'
      });
    }

    // Check if any member is already in another team
    const existingTeams = await Team.find({
      'members.user': { $in: members },
      isActive: true
    });

    if (existingTeams.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'أحد الأعضاء موجود بالفعل في فريق آخر'
      });
    }

    // Create team — convert plain IDs to member sub-documents
    const team = await Team.create({
      name,
      members: toMemberDocs(members),
      description,
      createdBy: req.user._id
    });

    // Populate members
    await team.populate('members.user', 'name email');

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'اسم الفريق موجود بالفعل'
      });
    }
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في إنشاء الفريق',
      error: error.message
    });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Teacher/Admin only
exports.getAllTeams = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بعرض جميع الفرق'
      });
    }

    const teams = await Team.find({ isActive: true })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الفرق',
      error: error.message
    });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private (student sees only their team, teacher/admin see all)
exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Access control: Students can only see their own team
    if (req.user.role === 'student') {
      if (!isMemberOf(team, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بعرض هذا الفريق'
        });
      }
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب الفريق',
      error: error.message
    });
  }
};

// @desc    Get my team (for logged-in student)
// @route   GET /api/teams/my-team
// @access  Student only
exports.getMyTeam = async (req, res) => {
  try {
    // Find team where user is a member
    const team = await Team.findOne({
      'members.user': req.user._id,
      isActive: true
    })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'أنت لست عضواً في أي فريق بعد'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب فريقك',
      error: error.message
    });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Teacher/Admin
exports.updateTeam = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'فقط المعلم أو المدير يمكنه تعديل الفرق'
      });
    }

    const { name, members, description } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // If updating members, validate
    if (members) {
      if (members.length < 2 || members.length > 4) {
        return res.status(400).json({
          success: false,
          message: 'الفريق يجب أن يحتوي على 2 إلى 4 أعضاء'
        });
      }

      // Validate: No duplicate members
      const uniqueMembers = [...new Set(members)];
      if (uniqueMembers.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن إضافة نفس الطالب أكثر من مرة'
        });
      }

      // Check if members are students
      const users = await User.find({ _id: { $in: members } });
      const nonStudents = users.filter(u => u.role !== 'student');
      if (nonStudents.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'جميع أعضاء الفريق يجب أن يكونوا طلاب'
        });
      }

      // Check if any new member is already in another team
      const currentMemberIds = team.members.map(m => (m.user?._id || m.user).toString());
      const newMembers = members.filter(m => !currentMemberIds.includes(m.toString()));
      if (newMembers.length > 0) {
        const existingTeams = await Team.find({
          _id: { $ne: team._id },
          'members.user': { $in: newMembers },
          isActive: true
        });
        if (existingTeams.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'أحد الأعضاء الجدد موجود بالفعل في فريق آخر'
          });
        }
      }
    }

    // Update fields
    if (name) team.name = name;
    if (members) {
      // Preserve existing roles for members that remain
      const existingRoles = {};
      team.members.forEach(m => {
        const uid = (m.user?._id || m.user).toString();
        existingRoles[uid] = m.role || 'unassigned';
      });
      team.members = members.map(id => ({
        user: id,
        role: existingRoles[id.toString()] || 'unassigned'
      }));
    }
    if (description !== undefined) team.description = description;

    await team.save();
    await team.populate('members.user', 'name email');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'اسم الفريق موجود بالفعل'
      });
    }
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في تعديل الفريق',
      error: error.message
    });
  }
};

// @desc    Delete team (soft delete)
// @route   DELETE /api/teams/:id
// @access  Teacher/Admin
exports.deleteTeam = async (req, res) => {
  try {
    // Validate: Teacher or Admin only
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'فقط المعلم أو المدير يمكنه حذف الفرق'
      });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Soft delete
    team.isActive = false;
    await team.save();

    res.json({
      success: true,
      message: 'تم حذف الفريق بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في حذف الفريق',
      error: error.message
    });
  }
};

// @desc    Student sets their own role within the team
// @route   PUT /api/teams/my-team/role
// @access  Student only
exports.setMyRole = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'الطلاب فقط يمكنهم تحديد أدوارهم' });
    }

    const VALID_ROLES = ['system_designer', 'hardware_engineer', 'tester'];
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `الدور غير صالح. الأدوار المتاحة: ${VALID_ROLES.join(' | ')}`
      });
    }

    const team = await Team.findOne({ 'members.user': req.user._id, isActive: true });
    if (!team) {
      return res.status(404).json({ success: false, message: 'أنت لست عضواً في أي فريق' });
    }

    // Check if this role is already taken by another member
    const roleTaken = team.members.some(
      m => m.role === role && (m.user?._id || m.user).toString() !== req.user._id.toString()
    );
    if (roleTaken) {
      return res.status(409).json({
        success: false,
        message: 'هذا الدور محجوز بالفعل لعضو آخر في الفريق'
      });
    }

    // Update the member's role
    const memberDoc = team.members.find(
      m => (m.user?._id || m.user).toString() === req.user._id.toString()
    );
    memberDoc.role = role;
    await team.save();
    await team.populate('members.user', 'name email');

    res.json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الدور', error: error.message });
  }
};

// @desc    Student sets their role for a specific project
// @route   PUT /api/teams/project/:projectId/role
// @access  Student only
exports.setMyProjectRole = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'الطلاب فقط يمكنهم تحديد أدوارهم' });
    }

    const VALID_ROLES = ['system_designer', 'hardware_engineer', 'tester'];
    const { role } = req.body;
    const { projectId } = req.params;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير صالح' });
    }

    // Find student's team
    const team = await Team.findOne({ 'members.user': req.user._id, isActive: true });
    if (!team) {
      return res.status(404).json({ success: false, message: 'أنت لست عضواً في أي فريق' });
    }

    // Find the TeamProject enrollment
    const teamProject = await TeamProject.findOne({ team: team._id, project: projectId });
    if (!teamProject) {
      return res.status(404).json({ success: false, message: 'فريقك غير مسجل في هذا المشروع' });
    }

    // Check role not already taken by another member in this project
    const roleTakenByOther = teamProject.memberRoles.some(
      mr => mr.role === role && mr.user.toString() !== req.user._id.toString()
    );
    if (roleTakenByOther) {
      return res.status(409).json({ success: false, message: 'هذا الدور محجوز لزميل آخر في هذا المشروع' });
    }

    // Assign or update the role in memberRoles
    const existing = teamProject.memberRoles.find(mr => mr.user.toString() === req.user._id.toString());
    if (existing) {
      existing.role = role;
    } else {
      teamProject.memberRoles.push({ user: req.user._id, role });
    }
    await teamProject.save();

    res.json({ success: true, data: teamProject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في تحديث الدور', error: error.message });
  }
};

  // @desc    Mark student as currently working on the simulator for a project
  // @route   PUT /api/teams/project/:projectId/active-editor
  // @access  Student only
  exports.setActiveEditor = async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ success: false, message: 'الطلاب فقط يمكنهم تحديث حالة العمل الآن' });
      }

      const { projectId } = req.params;

      const team = await Team.findOne({ 'members.user': req.user._id, isActive: true });
      if (!team) {
        return res.status(404).json({ success: false, message: 'أنت لست عضواً في أي فريق' });
      }

      const teamProject = await TeamProject.findOne({ team: team._id, project: projectId });
      if (!teamProject) {
        return res.status(404).json({ success: false, message: 'الفريق غير مسجل في هذا المشروع' });
      }

      teamProject.activeEditor = {
        user: req.user._id,
        activeSince: new Date()
      };
      await teamProject.save();
      await teamProject.populate('activeEditor.user', 'name');

      res.json({ success: true, data: teamProject.activeEditor });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
  };

  // @desc    Get who is currently working on the simulator (expires after 10 min)
  // @route   GET /api/teams/project/:projectId/active-editor
  // @access  Private
  exports.getActiveEditor = async (req, res) => {
    try {
      const { projectId } = req.params;

      const team = await Team.findOne({ 'members.user': req.user._id, isActive: true });
      if (!team) {
        return res.status(404).json({ success: false, message: 'أنت لست عضواً في أي فريق' });
      }

      const teamProject = await TeamProject.findOne({ team: team._id, project: projectId })
        .populate('activeEditor.user', 'name');

      if (!teamProject || !teamProject.activeEditor?.activeSince) {
        return res.json({ success: true, data: null });
      }

      // Expire after 10 minutes
      const TEN_MINUTES = 10 * 60 * 1000;
      const elapsed = Date.now() - new Date(teamProject.activeEditor.activeSince).getTime();
      if (elapsed > TEN_MINUTES) {
        teamProject.activeEditor = { user: null, activeSince: null };
        await teamProject.save();
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: teamProject.activeEditor });
    } catch (error) {
      res.status(500).json({ success: false, message: 'حدث خطأ', error: error.message });
    }
  };
