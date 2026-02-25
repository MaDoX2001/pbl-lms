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
import { useAppSettings } from '../context/AppSettingsContext';

const ManageInvitationsPage = () => {
  const { t } = useAppSettings();
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
      toast.error(error.message || t('invitationRequestsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await invitationService.approveRequest(selectedRequest._id);
      toast.success(t('requestApprovedAndInvitationSent'));
      setOpenApproveDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error(error.message || t('approveRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(t('enterRejectionReason'));
      return;
    }

    setLoading(true);
    try {
      await invitationService.rejectRequest(selectedRequest._id, rejectionReason);
      toast.success(t('requestRejected'));
      setOpenRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error(error.message || t('rejectRequestFailed'));
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
      pending: t('pendingReview'),
      approved: t('approved'),
      rejected: t('rejected')
    };
    return <Chip label={labels[status]} color={colors[status]} size="small" />;
  };

  const getRoleLabel = (role) => role === 'student' ? t('student') : t('teacher');

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
            {t('manageInvitationRequestsTitle')}
          </Typography>

          <Box display="flex" gap={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="invitation-status-filter-label">{t('status')}</InputLabel>
              <Select
                id="invitation-status-filter"
                labelId="invitation-status-filter-label"
                value={filter.status}
                onChange={(e) => {
                  setFilter(prev => ({ ...prev, status: e.target.value }));
                  setPage(1);
                }}
                label={t('status')}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                <MenuItem value="pending">{t('pendingReview')}</MenuItem>
                <MenuItem value="approved">{t('approved')}</MenuItem>
                <MenuItem value="rejected">{t('rejected')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="invitation-role-filter-label">{t('role')}</InputLabel>
              <Select
                id="invitation-role-filter"
                labelId="invitation-role-filter-label"
                value={filter.role}
                onChange={(e) => {
                  setFilter(prev => ({ ...prev, role: e.target.value }));
                  setPage(1);
                }}
                label={t('role')}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                <MenuItem value="student">{t('student')}</MenuItem>
                <MenuItem value="teacher">{t('teacher')}</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={fetchRequests}
              disabled={loading}
            >
              {t('refresh')}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            {t('totalRequestsWithCount', { count: total })}
          </Alert>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.light' }}>
            <TableRow>
              <TableCell align="right">{t('name')}</TableCell>
              <TableCell align="right">{t('email')}</TableCell>
              <TableCell align="right">{t('role')}</TableCell>
              <TableCell align="right">{t('status')}</TableCell>
              <TableCell align="right">{t('requestDate')}</TableCell>
              <TableCell align="right">{t('actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">{t('noRequestsFound')}</Typography>
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
                          {t('approve')}
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
                          {t('reject')}
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
        <DialogTitle>{t('approveConfirmationTitle')}</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Typography>
                {t('approveRequestForUser', { name: selectedRequest.name })}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {t('invitationWillBeSentTo', { email: selectedRequest.email })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApproveDialog(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('approve')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)} fullWidth>
        <DialogTitle>{t('rejectInvitationRequest')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            {t('enterRejectionReasonForUser')}
          </Typography>
          <TextField
            fullWidth
            label={t('rejectionReason')}
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t('rejectionReasonPlaceholder')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRejectDialog(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={loading || !rejectionReason.trim()}
          >
            {loading ? <CircularProgress size={24} /> : t('reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageInvitationsPage;
