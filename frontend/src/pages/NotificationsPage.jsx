import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useSelector } from 'react-redux';
import { useAppSettings } from '../context/AppSettingsContext';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import api from '../services/api';

const NotificationsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const { direction, t } = useAppSettings();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('-createdAt');

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setError('لا يوجد صلاحية للوصول إلى هذه الصفحة');
    }
  }, [user]);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoading(true);
      setError('');
      const response = await api.get('/notifications', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          unreadOnly: unreadOnly ? 'true' : 'false',
          sort: sortBy
        }
      });

      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setTotal(response.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('فشل في جلب الإخطارات. حاول مجددا.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchNotifications();
  }, [page, rowsPerPage, unreadOnly, sortBy]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await api.patch(`/notifications/${notificationId}/mark-read`);
      if (response.data.success) {
        setNotifications(
          notifications.map((n) =>
            n._id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
          )
        );
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        setNotifications(notifications.filter((n) => n._id !== notificationId));
        setTotal(Math.max(0, total - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/mark-all-read');
      if (response.data.success) {
        setNotifications(
          notifications.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('هل تريد حذف جميع الإخطارات؟')) {
      try {
        const response = await api.delete('/notifications', {
          params: { unreadOnly: unreadOnly ? 'true' : 'false' }
        });
        if (response.data.success) {
          setNotifications([]);
          setTotal(0);
        }
      } catch (err) {
        console.error('Error deleting all notifications:', err);
      }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
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

  const getTypeText = (type) => {
    switch (type) {
      case 'ai_evaluation':
        return 'تقييم AI';
      case 'admin_message':
        return 'رسالة إدارية';
      case 'system':
        return 'نظام';
      default:
        return 'إخطار';
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ar-EG');
  };

  if (error && !notifications.length) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          الإخطارات
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          إدارة جميع الإخطارات الخاصة بك
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchNotifications}
          disabled={loading}
        >
          تحديث
        </Button>
        <Button
          variant="outlined"
          startIcon={<MarkEmailReadIcon />}
          onClick={handleMarkAllAsRead}
          disabled={loading}
        >
          تحديد الكل كمقروء
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteAll}
          disabled={loading}
        >
          حذف الكل
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => setFilterOpen(true)}
        >
          تصفية
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)}>
        <DialogTitle>تصفية الإخطارات</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>الترتيب</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="الترتيب"
              >
                <MenuItem value="-createdAt">الأحدث أولا</MenuItem>
                <MenuItem value="createdAt">الأقدم أولا</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setUnreadOnly(!unreadOnly);
                setFilterOpen(false);
              }}
            >
              {unreadOnly ? 'عرض الكل' : 'عرض غير المقروء فقط'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Notifications Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    الحالة
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    النوع
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    العنوان
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    الأهمية
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    الوقت
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    الإجراءات
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography sx={{ color: 'text.secondary' }}>
                        لا توجد إخطارات للعرض
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow
                      key={notification._id}
                      sx={{
                        bgcolor: notification.readAt ? 'inherit' : 'action.hover',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        {!notification.readAt ? (
                          <Chip
                            label="جديد"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="مقروء"
                            size="small"
                            variant="outlined"
                            sx={{ color: 'text.secondary' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTypeText(notification.type)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: notification.readAt ? 400 : 600 }}>
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                            {notification.message}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSeverityText(notification.severity)}
                          size="small"
                          color={getSeverityColor(notification.severity)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(notification.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!notification.readAt && (
                            <IconButton
                              size="small"
                              onClick={() => handleMarkAsRead(notification._id)}
                              title="وضع علامة كمقروء"
                            >
                              <MarkEmailReadIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(notification._id)}
                            title="حذف"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </TableContainer>
    </Container>
  );
};

export default NotificationsPage;
