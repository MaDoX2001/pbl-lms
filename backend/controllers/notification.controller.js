const Notification = require('../models/Notification.model');

/**
 * @desc Get all notifications for admin (with pagination and filtering)
 * @route GET /api/notifications
 * @access Private (admin)
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    let query = { admin: req.user._id };

    if (unreadOnly === 'true') {
      query.readAt = null;
    }

    const notifications = await Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('relatedProject', 'title')
      .populate('relatedStudent', 'name')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      admin: req.user._id, 
      readAt: null 
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          unreadCount
        }
      },
      message: 'تم جلب الإخطارات بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get unread notifications count
 * @route GET /api/notifications/count/unread
 * @access Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      admin: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
      message: 'تم جلب عدد الإخطارات غير المقروءة'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark notification as read
 * @route PATCH /api/notifications/:id/mark-read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, admin: req.user._id },
      { readAt: new Date() },
      { new: true }
    ).populate('relatedProject', 'title')
     .populate('relatedStudent', 'name');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإخطار غير موجود أو ليس لديك الصلاحية للوصول إليه'
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
      message: 'تم تحديث حالة الإخطار بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/mark-all-read
 * @access Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { admin: req.user._id, readAt: null },
      { readAt: new Date() }
    );

    const unreadCount = await Notification.countDocuments({
      admin: req.user._id,
      readAt: null
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
      message: 'تم تحديث جميع الإخطارات بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      admin: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإخطار غير موجود أو ليس لديك الصلاحية له'
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'تم حذف الإخطار بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete all notifications (with optional filter)
 * @route DELETE /api/notifications
 * @access Private
 */
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    const { unreadOnly = false } = req.query;

    let query = { admin: req.user._id };
    if (unreadOnly === 'true') {
      query.readAt = null;
    }

    await Notification.deleteMany(query);

    res.status(200).json({
      success: true,
      data: {},
      message: 'تم حذف الإخطارات بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Internal: Create notification (called from assessment controller)
 * @access Internal
 */
exports.createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    return await notification.save();
  } catch (error) {
    console.error('خطأ في إنشاء الإخطار:', error.message);
    // Don't throw - notification failure shouldn't block the main operation
    return null;
  }
};
