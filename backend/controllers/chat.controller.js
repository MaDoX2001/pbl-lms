const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const User = require('../models/User.model');
const Team = require('../models/Team.model');
const multer = require('multer');
const cloudinaryService = require('../services/cloudinary.service');

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

exports.uploadChatFileMiddleware = chatUpload.single('file');

const emitToConversationRoom = (req, conversationId, eventName, payload) => {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`conversation-${conversationId}`).emit(eventName, payload);
};

// @desc    Get all conversations for current user (grouped by type)
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const { type } = req.query; // Optional filter by type
    
    const query = { participants: req.user.id };
    if (type) query.type = type;
    
    const conversations = await Conversation.find(query)
      .populate('participants', 'name avatar email role')
      .populate('lastMessage.sender', 'name avatar')
      .populate('admin', 'name avatar')
      .populate('team', 'name')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المحادثات',
      error: error.message
    });
  }
};

// @desc    Get or create direct conversation
// @route   POST /api/chat/conversations/direct
// @access  Private
exports.getOrCreateDirectConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, userId], $size: 2 }
    })
      .populate('participants', 'name avatar email role')
      .populate('lastMessage.sender', 'name avatar');

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        type: 'direct',
        participants: [req.user.id, userId]
      });

      await conversation.populate('participants', 'name avatar email role');
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المحادثة',
      error: error.message
    });
  }
};

// @desc    Create group conversation
// @route   POST /api/chat/conversations/group
// @access  Private (Teacher/Admin)
exports.createGroupConversation = async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants || participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'اسم المجموعة والمشاركين مطلوبين (على الأقل 2)'
      });
    }

    // Add creator to participants if not included
    const allParticipants = [...new Set([req.user.id, ...participants])];

    const conversation = await Conversation.create({
      type: 'group',
      name,
      participants: allParticipants,
      admin: req.user.id
    });

    await conversation.populate('participants', 'name avatar email role');
    await conversation.populate('admin', 'name avatar');

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المجموعة',
      error: error.message
    });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    if (!conversation.hasParticipant(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذه المحادثة'
      });
    }

    // Build query
    const query = {
      conversation: id,
      deletedFor: { $ne: req.user.id }
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name avatar role')
      .populate({
        path: 'replyTo',
        select: 'content sender attachment isDeleted type createdAt',
        populate: { path: 'sender', select: 'name avatar' }
      })
      .populate('forwardedFrom.sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الرسائل',
      error: error.message
    });
  }
};

// @desc    Send message
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'text', attachment, replyTo } = req.body;

    if (!String(content || '').trim() && !attachment) {
      return res.status(400).json({
        success: false,
        message: 'محتوى الرسالة مطلوب'
      });
    }

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    if (!conversation.hasParticipant(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإرسال رسائل في هذه المحادثة'
      });
    }

    let replyMessageId = null;
    if (replyTo) {
      const targetReply = await Message.findById(replyTo).select('_id conversation');
      if (!targetReply || targetReply.conversation.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: 'رسالة الرد غير صالحة'
        });
      }
      replyMessageId = targetReply._id;
    }

    // Create message
    const message = await Message.create({
      conversation: id,
      sender: req.user.id,
      content: String(content || '').trim(),
      type,
      attachment,
      replyTo: replyMessageId,
      readBy: [{
        user: req.user.id,
        readAt: new Date()
      }]
    });

    await message.populate('sender', 'name avatar role');
    await message.populate({
      path: 'replyTo',
      select: 'content sender attachment isDeleted type createdAt',
      populate: { path: 'sender', select: 'name avatar' }
    });
    await message.populate('forwardedFrom.sender', 'name avatar');

    // Update conversation last message
    const lastMessageText = String(content || '').trim()
      || (type === 'image' ? '📷 صورة' : (type === 'file' ? '📎 ملف' : 'رسالة'));
    conversation.lastMessage = {
      text: lastMessageText,
      sender: req.user.id,
      timestamp: new Date()
    };

    // Update unread count for other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    emitToConversationRoom(req, id, 'new-message', {
      ...message.toObject(),
      conversationId: id
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الرسالة',
      error: error.message
    });
  }
};

// @desc    Send image/file message via multipart upload
// @route   POST /api/chat/conversations/:id/messages/upload
// @access  Private
exports.sendAttachmentMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const caption = String(req.body?.content || '').trim();

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    if (!conversation.hasParticipant(req.user.id)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالإرسال في هذه المحادثة' });
    }

    const folder = `chat/${id}`;
    const uploaded = await cloudinaryService.uploadFile(req.file.buffer, req.file.originalname, folder);
    const isImage = req.file.mimetype?.startsWith('image/');

    const message = await Message.create({
      conversation: id,
      sender: req.user.id,
      content: caption,
      type: isImage ? 'image' : 'file',
      attachment: {
        url: uploaded.url,
        publicId: uploaded.fileId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      },
      readBy: [{ user: req.user.id, readAt: new Date() }]
    });

    await message.populate('sender', 'name avatar role');

    conversation.lastMessage = {
      text: caption || (isImage ? '📷 صورة' : '📎 ملف'),
      sender: req.user.id,
      timestamp: new Date()
    };

    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    emitToConversationRoom(req, id, 'new-message', {
      ...message.toObject(),
      conversationId: id
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال المرفق',
      error: error.message
    });
  }
};

// @desc    Edit own message
// @route   PUT /api/chat/messages/:messageId
// @access  Private
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const newContent = String(req.body?.content || '').trim();

    if (!newContent) {
      return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب للتعديل' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
    }

    if (message.sender.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'يمكنك تعديل رسائلك فقط' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: 'لا يمكن تعديل رسالة محذوفة' });
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', 'name avatar role');
    await message.populate({
      path: 'replyTo',
      select: 'content sender attachment isDeleted type createdAt',
      populate: { path: 'sender', select: 'name avatar' }
    });

    emitToConversationRoom(req, message.conversation.toString(), 'message-updated', {
      ...message.toObject(),
      conversationId: message.conversation.toString()
    });

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تعديل الرسالة', error: error.message });
  }
};

// @desc    Delete own message for everyone
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
    }

    if (message.sender.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'يمكنك حذف رسائلك فقط' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;
    message.content = 'تم حذف هذه الرسالة';
    message.attachment = undefined;
    message.type = 'text';
    await message.save();

    emitToConversationRoom(req, message.conversation.toString(), 'message-deleted', {
      messageId: message._id,
      conversationId: message.conversation.toString(),
      isDeleted: true,
      content: message.content,
      deletedAt: message.deletedAt
    });

    res.json({ success: true, data: { _id: message._id, isDeleted: true } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف الرسالة', error: error.message });
  }
};

// @desc    Forward a message to another conversation
// @route   POST /api/chat/messages/:messageId/forward
// @access  Private
exports.forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { targetConversationId } = req.body;

    if (!targetConversationId) {
      return res.status(400).json({ success: false, message: 'المحادثة المستهدفة مطلوبة' });
    }

    const [sourceMessage, targetConversation] = await Promise.all([
      Message.findById(messageId).populate('sender', 'name avatar role'),
      Conversation.findById(targetConversationId)
    ]);

    if (!sourceMessage) {
      return res.status(404).json({ success: false, message: 'الرسالة المراد تحويلها غير موجودة' });
    }

    if (!targetConversation) {
      return res.status(404).json({ success: false, message: 'المحادثة المستهدفة غير موجودة' });
    }

    if (!targetConversation.hasParticipant(req.user.id)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالتحويل لهذه المحادثة' });
    }

    const forwarded = await Message.create({
      conversation: targetConversationId,
      sender: req.user.id,
      content: sourceMessage.content,
      type: sourceMessage.type,
      attachment: sourceMessage.attachment,
      forwardedFrom: {
        message: sourceMessage._id,
        sender: sourceMessage.sender?._id,
        conversation: sourceMessage.conversation
      },
      readBy: [{ user: req.user.id, readAt: new Date() }]
    });

    await forwarded.populate('sender', 'name avatar role');
    await forwarded.populate('forwardedFrom.sender', 'name avatar');

    targetConversation.lastMessage = {
      text: forwarded.content || (forwarded.type === 'image' ? '📷 صورة (محولة)' : '📎 ملف (محول)'),
      sender: req.user.id,
      timestamp: new Date()
    };

    targetConversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id.toString()) {
        const currentCount = targetConversation.unreadCount.get(participantId.toString()) || 0;
        targetConversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });

    await targetConversation.save();

    emitToConversationRoom(req, targetConversationId, 'new-message', {
      ...forwarded.toObject(),
      conversationId: targetConversationId
    });

    res.status(201).json({ success: true, data: forwarded });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحويل الرسالة', error: error.message });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/conversations/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    if (!conversation.hasParticipant(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذه المحادثة'
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversation: id,
        'readBy.user': { $ne: req.user.id }
      },
      {
        $push: {
          readBy: {
            user: req.user.id,
            readAt: new Date()
          }
        }
      }
    );

    // Reset unread count
    conversation.unreadCount.set(req.user.id.toString(), 0);
    await conversation.save();

    emitToConversationRoom(req, id, 'messages-read', {
      conversationId: id,
      readerId: req.user.id.toString(),
      readAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'تم تحديث حالة القراءة'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة القراءة',
      error: error.message
    });
  }
};

// @desc    Get all users (for starting conversations)
// @route   GET /api/chat/users
// @access  Private
exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    
    const query = { _id: { $ne: req.user.id } };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name avatar email role')
      .limit(20);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين',
      error: error.message
    });
  }
};

// @desc    Get or create team conversation (team members only)
// @route   POST /api/chat/conversations/team
// @access  Private (Student in team)
exports.getOrCreateTeamConversation = async (req, res) => {
  try {
    console.log('Team chat request from user:', req.user.id, 'role:', req.user.role);
    
    // Get user's team
    const team = await Team.findOne({
      'members.user': req.user.id,
      isActive: true
    }).populate('members.user', 'name avatar email role');

    console.log('Found team:', team ? team._id : 'null');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'أنت لست عضواً في أي فريق'
      });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      type: 'team',
      team: team._id
    })
      .populate('participants', 'name avatar email role')
      .populate('team', 'name');

    console.log('Existing team conversation:', conversation ? conversation._id : 'null');

    if (!conversation) {
      // Create team conversation
      conversation = await Conversation.create({
        type: 'team',
        name: `${team.name} - محادثة الفريق`,
        team: team._id,
        participants: team.members.map(m => m.user?._id || m.user)
      });

      await conversation.populate('participants', 'name avatar email role');
      await conversation.populate('team', 'name');
      
      console.log('Created new team conversation:', conversation._id);
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Team chat error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء محادثة الفريق',
      error: error.message
    });
  }
};

// @desc    Get or create team+teachers conversation
// @route   POST /api/chat/conversations/team-teachers
// @access  Private (Student/Teacher)
exports.getOrCreateTeamTeachersConversation = async (req, res) => {
  try {
    console.log('Team+Teachers chat request from user:', req.user.id, 'role:', req.user.role);
    
    let team;
    
    if (req.user.role === 'student') {
      // Get student's team
      team = await Team.findOne({
        'members.user': req.user.id,
        isActive: true
      }).populate('members.user', 'name avatar email role');

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'أنت لست عضواً في أي فريق'
        });
      }
    } else {
      // Teacher/Admin: get team by ID from request
      const { teamId } = req.body;
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'معرف الفريق مطلوب'
        });
      }
      
      team = await Team.findById(teamId).populate('members.user', 'name avatar email role');
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'الفريق غير موجود'
        });
      }
    }

    console.log('Found team:', team._id);

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      type: 'team_teachers',
      team: team._id
    })
      .populate('participants', 'name avatar email role')
      .populate('team', 'name');

    console.log('Existing team+teachers conversation:', conversation ? conversation._id : 'null');

    if (!conversation) {
      // Get all teachers and admins
      const teachers = await User.find({
        role: { $in: ['teacher', 'admin'] }
      }).select('_id');

      console.log('Found teachers count:', teachers.length);

      // Create conversation with team + teachers
      const allParticipants = [
        ...team.members.map(m => (m.user?._id || m.user).toString()),
        ...teachers.map(t => t._id.toString())
      ];
      
      // Remove duplicates and convert back to ObjectIds
      const uniqueParticipants = [...new Set(allParticipants)];

      conversation = await Conversation.create({
        type: 'team_teachers',
        name: `${team.name} + المعلمين`,
        team: team._id,
        participants: uniqueParticipants
      });

      await conversation.populate('participants', 'name avatar email role');
      await conversation.populate('team', 'name');
      
      console.log('Created new team+teachers conversation:', conversation._id);
    } else {
      // Ensure current teacher/admin is a participant in existing conversation
      const participantIds = conversation.participants.map((p) =>
        (p?._id || p).toString()
      );
      if (!participantIds.includes(req.user.id.toString())) {
        conversation.participants.push(req.user.id);
        await conversation.save();
        await conversation.populate('participants', 'name avatar email role');
      }
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Team+Teachers chat error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء محادثة الفريق + المعلمين',
      error: error.message
    });
  }
};

// @desc    Get or create general conversation (all users)
// @route   POST /api/chat/conversations/general
// @access  Private
exports.getOrCreateGeneralConversation = async (req, res) => {
  try {
    // Check if general conversation exists
    let conversation = await Conversation.findOne({
      type: 'general'
    })
      .populate('participants', 'name avatar email role');

    if (!conversation) {
      // Get all active users
      const users = await User.find({ isActive: true }).select('_id');

      // Create general conversation
      conversation = await Conversation.create({
        type: 'general',
        name: 'المحادثة العامة',
        participants: users.map(u => u._id)
      });

      await conversation.populate('participants', 'name avatar email role');
    } else {
      // Check if current user is in participants (compare with unpopulated IDs)
      const participantIds = conversation.participants.map(p => 
        typeof p === 'object' ? p._id.toString() : p.toString()
      );
      
      if (!participantIds.includes(req.user.id.toString())) {
        // Re-fetch conversation without population to add user
        conversation = await Conversation.findById(conversation._id);
        conversation.participants.push(req.user.id);
        await conversation.save();
        await conversation.populate('participants', 'name avatar email role');
      }
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المحادثة العامة',
      error: error.message
    });
  }
};
