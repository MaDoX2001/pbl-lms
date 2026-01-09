import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Typography,
  Alert
} from '@mui/material';
import { CheckCircleOutline, BlockOutlined, RefreshOutlined } from '@mui/icons-material';
import invitationService from '../services/invitationService';
import { toast } from 'react-toastify';

const ManageInvitationsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [filter, setFilter] = useState({ status: '', role: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const limit = 10;

  useEffect(() => {
    fetchRequests();
  }, [page, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await invitationService.getAllRequests(
        filter.status || undefined,
        filter.role || undefined,
        page,
        limit
      );
      setRequests(response.data);
      setTotal(response.total);
      setPages(response.pages);
    } catch (error) {
      toast.error(error.message || 'خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await invitationService.approveRequest(selectedRequest._id);
      toast.success('تم الموافقة على الطلب وإرسال الدعوة');
      setOpenApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error(error.message || 'خطأ في الموافقة');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('يجب إدخال سبب الرفض');
      return;
    }

    setLoading(true);
    try {
      await invitationService.rejectRequest(selectedRequest._id, rejectionReason);
      toast.success('تم رفض الطلب');
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error(error.message || 'خطأ في رفض الطلب');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    };
    const labels = {
      pending: 'قيد المراجعة',
      approved: 'موافق عليه',
      rejected: 'مرفوض'
    };
    return <Chip label={labels[status]} color={colors[status]} size="small" />;
  };

  const getRoleLabel = (role) => role === 'student' ? 'طالب' : 'معلم';

  if (loading && requests.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
            إدارة طلبات الدعوات
          </Typography>

          <Box display="flex" gap={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filter.status}
                onChange={(e) => {
                  setFilter(prev => ({ ...prev, status: e.target.value }));
                  setPage(1);
                }}
                label="الحالة"
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="pending">قيد المراجعة</MenuItem>
                <MenuItem value="approved">موافق عليه</MenuItem>
                <MenuItem value="rejected">مرفوض</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>الدور</InputLabel>
              <Select
                value={filter.role}
                onChange={(e) => {
                  setFilter(prev => ({ ...prev, role: e.target.value }));
                  setPage(1);
                }}
                label="الدور"
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="student">طالب</MenuItem>
                <MenuItem value="teacher">معلم</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={fetchRequests}
              disabled={loading}
            >
              تحديث
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            إجمالي الطلبات: <strong>{total}</strong>
          </Alert>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell align="right">الاسم</TableCell>
              <TableCell align="right">البريد الإلكتروني</TableCell>
              <TableCell align="right">الدور</TableCell>
              <TableCell align="right">الحالة</TableCell>
              <TableCell align="right">تاريخ الطلب</TableCell>
              <TableCell align="right">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">لا توجد طلبات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map(request => (
                <TableRow key={request._id} hover>
                  <TableCell align="right">{request.name}</TableCell>
                  <TableCell align="right">{request.email}</TableCell>
                  <TableCell align="right">{getRoleLabel(request.requestedRole)}</TableCell>
                  <TableCell align="right">{getStatusChip(request.status)}</TableCell>
                  <TableCell align="right">
                    {new Date(request.requestedAt).toLocaleDateString('ar-EG')}
                  </TableCell>
                  <TableCell align="right">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleOutline />}
                          onClick={() => {
                            setSelectedRequest(request);
                            setOpenApproveDialog(true);
                          }}
                          sx={{ mr: 1 }}
                        >
                          موافق
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<BlockOutlined />}
                          onClick={() => {
                            setSelectedRequest(request);
                            setOpenRejectDialog(true);
                          }}
                        >
                          رفض
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pages > 1 && (
        <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={pages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Approve Dialog */}
      <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)}>
        <DialogTitle>تأكيد الموافقة</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Typography>
                هل تريد الموافقة على طلب <strong>{selectedRequest.name}</strong>؟
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                سيتم إرسال دعوة على بريده الإلكتروني: {selectedRequest.email}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproveDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'موافق'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)} fullWidth>
        <DialogTitle>رفض الطلب</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            أدخل سبب الرفض (سيتم إرساله للمستخدم)
          </Typography>
          <TextField
            fullWidth
            label="سبب الرفض"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="مثال: البريد غير صحيح، أو لا تتوفر الشروط..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || !rejectionReason.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'رفض'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageInvitationsPage;
