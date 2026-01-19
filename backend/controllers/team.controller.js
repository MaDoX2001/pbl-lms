const Team = require('../models/Team.model');
const User = require('../models/User.model');

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
// @access  Admin only
exports.createTeam = async (req, res) => {
  try {
    const { name, members, description } = req.body;

    // Validate: Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير يمكنه إنشاء الفرق'
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
      members: { $in: members },
      isActive: true
    });

    if (existingTeams.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'أحد الأعضاء موجود بالفعل في فريق آخر'
      });
    }

    // Create team
    const team = await Team.create({
      name,
      members,
      description,
      createdBy: req.user._id
    });

    // Populate members
    await team.populate('members', 'name email');

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
      .populate('members', 'name email')
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
      .populate('members', 'name email')
      .populate('createdBy', 'name');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'الفريق غير موجود'
      });
    }

    // Access control: Students can only see their own team
    if (req.user.role === 'student') {
      const isMember = team.members.some(
        member => member._id.toString() === req.user._id.toString()
      );
      if (!isMember) {
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
      members: req.user._id,
      isActive: true
    })
      .populate('members', 'name email')
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
// @access  Admin only
exports.updateTeam = async (req, res) => {
  try {
    // Validate: Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير يمكنه تعديل الفرق'
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
      const newMembers = members.filter(
        m => !team.members.map(mem => mem.toString()).includes(m)
      );
      if (newMembers.length > 0) {
        const existingTeams = await Team.find({
          _id: { $ne: team._id },
          members: { $in: newMembers },
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
    if (members) team.members = members;
    if (description !== undefined) team.description = description;

    await team.save();
    await team.populate('members', 'name email');

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
// @access  Admin only
exports.deleteTeam = async (req, res) => {
  try {
    // Validate: Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط المدير يمكنه حذف الفرق'
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
