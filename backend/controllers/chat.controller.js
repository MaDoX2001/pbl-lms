const Conversation = require('../models/Conversation.model');
const Message = require('../models/Message.model');
const User = require('../models/User.model');

// @desc    Get all conversations for current user
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'name avatar email role')
      .populate('lastMessage.sender', 'name avatar')
      .populate('admin', 'name avatar')
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
    const { content, type = 'text', attachment } = req.body;

    if (!content && !attachment) {
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

    // Create message
    const message = await Message.create({
      conversation: id,
      sender: req.user.id,
      content,
      type,
      attachment,
      readBy: [{
        user: req.user.id,
        readAt: new Date()
      }]
    });

    await message.populate('sender', 'name avatar role');

    // Update conversation last message
    conversation.lastMessage = {
      text: content,
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
