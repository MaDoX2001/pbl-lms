import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Button,
  Chip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useSelector } from 'react-redux';
import { useAppSettings } from '../context/AppSettingsContext';
import api from '../services/api';

const NotificationMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { direction, t } = useAppSettings();
  const isArabic = direction === 'rtl';

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setLoading(true);
      const response = await api.get('/notifications', {
        params: { page: 1, limit: 10, sort: '-createdAt' }
      });
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.pagination?.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on component mount and set up polling
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    // Refresh notifications when menu opens
    if (user && user.role === 'admin') {
      fetchNotifications();
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await api.patch(`/notifications/${notificationId}/mark-read`);
      if (response.data.success) {
        // Update local state
        setNotifications(
          notifications.map((n) =>
            n._id === notificationId ? { ...n, readAt: new Date() } : n
          )
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/mark-all-read');
      if (response.data.success) {
        // Mark all as read locally
        setNotifications(
          notifications.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        setNotifications(notifications.filter((n) => n._id !== notificationId));
        if (unreadCount > 0) {
          setUnreadCount(unreadCount - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Only show for admins
  if (!user || user.role !== 'admin') {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#2196f3';
      default:
        return '#9c27b0';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high':
        return 'مهم';
      case 'medium':
        return 'عادي';
      case 'low':
        return 'منخفض';
      default:
        return 'نظام';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'للتو';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return d.toLocaleDateString('ar-EG');
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        aria-label="notifications"
        sx={{ borderRadius: 2 }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#d32f2f',
              color: '#d32f2f',
              boxShadow: '0 0 0 2px white'
            }
          }}
        >
          {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isArabic ? 'left' : 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isArabic ? 'left' : 'right'
        }}
        sx={{
          '& .MuiPaper-root': {
            minWidth: '350px',
            maxWidth: '450px',
            maxHeight: '500px',
            overflow: 'auto'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            sticky: true,
            zIndex: 10
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              الإخطارات
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {unreadCount} غير مقروء
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              تحديث الكل
            </Button>
          )}
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.secondary', mb: 1 }}>
              لا توجد إخطارات
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              ستظهر الإخطارات هنا عند إكمال التقييمات
            </Typography>
          </Box>
        )}

        {/* Notifications List */}
        {!loading && notifications.length > 0 && (
          <Box>
            {notifications.map((notification, index) => (
              <Box key={notification._id}>
                <MenuItem
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 2,
                    px: 2,
                    bgcolor: notification.readAt ? 'background.paper' : 'action.hover',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  {/* Notification Header */}
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: notification.readAt ? 400 : 600,
                            flex: 1,
                            wordBreak: 'break-word'
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.readAt && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </Box>

                      {/* Severity Chip */}
                      <Chip
                        label={getSeverityText(notification.severity)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: getSeverityColor(notification.severity),
                          color: 'white',
                          mb: 1
                        }}
                      />

                      {/* Message */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: notification.readAt ? 400 : 500,
                          mb: 1,
                          wordBreak: 'break-word',
                          lineHeight: 1.4
                        }}
                      >
                        {notification.message}
                      </Typography>

                      {/* Timestamp */}
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {formatDate(notification.createdAt)}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      {!notification.readAt && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification._id);
                          }}
                          title="وضع علامة كمقروء"
                          sx={{ p: 0.5 }}
                        >
                          <MarkEmailReadIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification._id);
                        }}
                        title="حذف"
                        sx={{ p: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </MenuItem>

                {index < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}

        {/* Footer */}
        {!loading && notifications.length > 0 && (
          <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              href="/dashboard/notifications"
              sx={{ textTransform: 'none', color: 'primary.main', fontSize: '0.875rem' }}
            >
              عرض جميع الإخطارات
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationMenu;
