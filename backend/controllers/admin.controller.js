const User = require('../models/User.model');
const Invitation = require('../models/Invitation.model');
const Project = require('../models/Project.model');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin only
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Admin only
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير صالح' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin only
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الخاص' });
    }

    await user.deleteOne();

    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send invitation
// @route   POST /api/admin/invitations
// @access  Admin only
exports.sendInvitation = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'هذا البريد الإلكتروني مسجل بالفعل' 
      });
    }

    // Check if invitation already exists and not used
    const existingInvitation = await Invitation.findOne({ 
      email, 
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({ 
        success: false, 
        message: 'تم إرسال دعوة لهذا البريد بالفعل' 
      });
    }

    // Create invitation
    const invitation = await Invitation.create({
      email,
      role: role || 'student',
      invitedBy: req.user.id
    });

    // TODO: Send email with invitation link
    // const invitationLink = `${process.env.CLIENT_URL}/register?token=${invitation.token}`;
    // await sendEmail({ to: email, subject: 'دعوة للانضمام', html: invitationLink });

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'تم إرسال الدعوة بنجاح',
      invitationLink: `${process.env.CLIENT_URL}/register?token=${invitation.token}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all invitations
// @route   GET /api/admin/invitations
// @access  Admin only
exports.getAllInvitations = async (req, res) => {
  try {
    const { used, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (used !== undefined) query.used = used === 'true';

    const invitations = await Invitation.find(query)
      .populate('invitedBy', 'name email')
      .populate('usedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Invitation.countDocuments(query);

    res.json({
      success: true,
      data: invitations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete invitation
// @route   DELETE /api/admin/invitations/:id
// @access  Admin only
exports.deleteInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'الدعوة غير موجودة' });
    }

    await invitation.deleteOne();

    res.json({ success: true, message: 'تم حذف الدعوة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Admin only
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalProjects = await Project.countDocuments();
    const publishedProjects = await Project.countDocuments({ isPublished: true });
    const pendingInvitations = await Invitation.countDocuments({ used: false, expiresAt: { $gt: new Date() } });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: totalStudents,
          teachers: totalTeachers,
          admins: await User.countDocuments({ role: 'admin' })
        },
        projects: {
          total: totalProjects,
          published: publishedProjects,
          draft: totalProjects - publishedProjects
        },
        invitations: {
          pending: pendingInvitations,
          used: await Invitation.countDocuments({ used: true })
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
