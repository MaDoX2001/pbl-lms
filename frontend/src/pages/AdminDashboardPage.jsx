import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import api from '../services/api';

function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [invitationRequests, setInvitationRequests] = useState([]);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'student' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [rejectDialog, setRejectDialog] = useState({ open: false, requestId: null, reason: '' });
  const [requestsTab, setRequestsTab] = useState('pending');

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchInvitations();
    fetchInvitationRequests();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/admin/invitations');
      setInvitations(response.data.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchInvitationRequests = async () => {
    try {
      const response = await api.get('/invitations/admin/all');
      setInvitationRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching invitation requests:', error);
    }
  };

  const handleSendInvitation = async () => {
    try {
      const response = await api.post('/admin/invitations', inviteForm);
      setSuccessMessage('تم إرسال الدعوة بنجاح!');
      setInvitationLink(response.data.invitationLink);
      setOpenInviteDialog(false);
      setInviteForm({ email: '', role: 'student' });
      fetchInvitations();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل إرسال الدعوة');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      setSuccessMessage('تم حذف المستخدم بنجاح');
      fetchUsers();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل حذف المستخدم');
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    try {
      await api.delete(`/admin/invitations/${invitationId}`);
      setSuccessMessage('تم حذف الدعوة بنجاح');
      fetchInvitations();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل حذف الدعوة');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('تم نسخ الرابط!');
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const response = await api.post(`/invitations/admin/${requestId}/approve`);
      setSuccessMessage('تم الموافقة وإرسال الدعوة');
      fetchInvitationRequests();
      fetchStats();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل الموافقة على الطلب');
    }
  };

  const handleRejectRequest = async () => {
    try {
      await api.post(`/invitations/admin/${rejectDialog.requestId}/reject`, {
        reason: rejectDialog.reason
      });
      setSuccessMessage('تم رفض الطلب');
      setRejectDialog({ open: false, requestId: null, reason: '' });
      fetchInvitationRequests();
      fetchStats();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل رفض الطلب');
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin/approve-user/${userId}`);
      setSuccessMessage('تم الموافقة على المستخدم');
      fetchUsers();
      fetchStats();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'فشل الموافقة على المستخدم');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        لوحة تحكم المدير
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
          {invitationLink && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {invitationLink}
              </Typography>
              <IconButton size="small" onClick={() => copyToClipboard(invitationLink)}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      {/* Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  إجمالي المستخدمين
                </Typography>
                <Typography variant="h3">{stats.users.total}</Typography>
                <Typography variant="body2" color="text.secondary">
                  طلاب: {stats.users.students} | معلمين: {stats.users.teachers}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  المشروعات
                </Typography>
                <Typography variant="h3">{stats.projects.total}</Typography>
                <Typography variant="body2" color="text.secondary">
                  منشور: {stats.projects.published}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  الدعوات
                </Typography>
                <Typography variant="h3">{stats.invitations.pending}</Typography>
                <Typography variant="body2" color="text.secondary">
                  مستخدمة: {stats.invitations.used}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ backgroundColor: '#fff3e0' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  طلبات الدعوة
                </Typography>
                <Typography variant="h3" sx={{ color: '#f57c00' }}>{stats.requests?.pending || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  معلقة للمراجعة
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Send Invitation */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">إرسال دعوة</Typography>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setOpenInviteDialog(true)}
          >
            إرسال دعوة جديدة
          </Button>
        </Box>
      </Paper>

      {/* Users Table */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          المستخدمون ({users.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الدور</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الانضمام</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? 'مدير' : user.role === 'teacher' ? 'معلم' : 'طالب'}
                      color={user.role === 'admin' ? 'error' : user.role === 'teacher' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isApproved ? 'موافق عليه' : 'بانتظار الموافقة'}
                      color={user.isApproved ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    {user.role !== 'admin' && (
                      <>
                        {!user.isApproved && (
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleApproveUser(user._id)}
                            title="الموافقة"
                          >
                            <CheckIcon />
                          </IconButton>
                        )}
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invitation Requests Table */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            طلبات الدعوة ({invitationRequests.length})
          </Typography>
          {invitationRequests.filter(r => r.status === 'pending').length > 0 && (
            <Chip
              label={`${invitationRequests.filter(r => r.status === 'pending').length} معلق`}
              color="warning"
              size="small"
            />
          )}
        </Box>

        <Tabs
          value={requestsTab}
          onChange={(e, value) => setRequestsTab(value)}
          sx={{ mb: 2 }}
        >
          <Tab
            label={`المعلقة (${invitationRequests.filter(r => r.status === 'pending').length})`}
            value="pending"
          />
          <Tab
            label={`الموافق عليها (${invitationRequests.filter(r => r.status === 'approved').length})`}
            value="approved"
          />
          <Tab
            label={`المرفوضة (${invitationRequests.filter(r => r.status === 'rejected').length})`}
            value="rejected"
          />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>الاسم</strong></TableCell>
                <TableCell><strong>البريد الإلكتروني</strong></TableCell>
                <TableCell><strong>الدور المطلوب</strong></TableCell>
                <TableCell><strong>الحالة</strong></TableCell>
                <TableCell><strong>التاريخ</strong></TableCell>
                <TableCell><strong>إجراءات</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitationRequests
                .filter(req => req.status === requestsTab)
                .map((request) => (
                  <TableRow key={request._id} sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                    <TableCell>{request.name}</TableCell>
                    <TableCell sx={{ direction: 'ltr', textAlign: 'left' }}>{request.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={request.requestedRole === 'teacher' ? 'معلم' : 'طالب'}
                        color={request.requestedRole === 'teacher' ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Chip
                          label={request.status === 'pending' ? 'قيد الانتظار' : request.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                          color={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'}
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                        {request.status === 'pending' && (
                          <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            بانتظار مراجعة الادمن
                          </Typography>
                        )}
                        {request.status === 'approved' && request.respondedAt && (
                          <Typography variant="caption" display="block" sx={{ color: 'success.main', mt: 0.5 }}>
                            تم الإرسال: {new Date(request.respondedAt).toLocaleDateString('ar-EG')}
                          </Typography>
                        )}
                        {request.status === 'rejected' && request.rejectionReason && (
                          <Typography variant="caption" display="block" sx={{ color: 'error.main', mt: 0.5 }}>
                            السبب: {request.rejectionReason}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(request.requestedAt || request.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <>
                          <IconButton
                            color="success"
                            size="small"
                            title="الموافقة"
                            onClick={() => handleApproveRequest(request._id)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            title="الرفض"
                            onClick={() => setRejectDialog({ open: true, requestId: request._id, reason: '' })}
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {invitationRequests.filter(r => r.status === requestsTab).length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                لا توجد طلبات {requestsTab === 'pending' ? 'معلقة' : requestsTab === 'approved' ? 'موافق عليها' : 'مرفوضة'}
              </Typography>
            </Box>
          )}
        </TableContainer>
      </Paper>

      {/* Sent Invitations Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          الدعوات المُرسلة ({invitations.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الدور</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الإنشاء</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation._id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={invitation.role === 'teacher' ? 'معلم' : 'طالب'}
                      color={invitation.role === 'teacher' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invitation.used ? 'مستخدمة' : 'قيد الانتظار'}
                      color={invitation.used ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(invitation.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                  <TableCell>
                    {!invitation.used && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(`${window.location.origin}/register?token=${invitation.token}`)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteInvitation(invitation._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invite Dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>إرسال دعوة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>الدور</InputLabel>
            <Select
              value={inviteForm.role}
              label="الدور"
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <MenuItem value="student">طالب</MenuItem>
              <MenuItem value="teacher">معلم</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInviteDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSendInvitation}>
            إرسال
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, requestId: null, reason: '' })}>
        <DialogTitle>رفض طلب الدعوة</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            يرجى إدخال سبب الرفض:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            placeholder="مثلاً: البيانات غير دقيقة، أو الكوتا ممتلئة..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, requestId: null, reason: '' })}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectRequest}
            disabled={!rejectDialog.reason.trim()}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboardPage;
