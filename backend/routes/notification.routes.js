const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

/**
 * @route GET /api/notifications
 * @desc Get all notifications for current admin user
 * @access Private
 */
router.get('/', getNotifications);

/**
 * @route GET /api/notifications/count/unread
 * @desc Get count of unread notifications
 * @access Private
 */
router.get('/count/unread', getUnreadCount);

/**
 * @route PATCH /api/notifications/mark-all-read
 * @desc Mark all notifications as read
 * @access Private
 */
router.patch('/mark-all-read', markAllAsRead);

/**
 * @route PATCH /api/notifications/:id/mark-read
 * @desc Mark single notification as read
 * @access Private
 */
router.patch('/:id/mark-read', markAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete single notification
 * @access Private
 */
router.delete('/:id', deleteNotification);

/**
 * @route DELETE /api/notifications
 * @desc Delete all notifications (or filter)
 * @access Private
 */
router.delete('/', deleteAllNotifications);

module.exports = router;
