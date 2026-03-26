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
  Check as CheckIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

function AdminDashboardPage() {
  const { t } = useAppSettings();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
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
      const pageSize = 100;
      let page = 1;
      let totalPages = 1;
      const allUsers = [];

      do {
        const response = await api.get('/admin/users', {
          params: { page, limit: pageSize },
        });

        allUsers.push(...(response.data.data || []));
        totalPages = Number(response.data.totalPages) || 1;
        page += 1;
      } while (page <= totalPages);

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      setSuccessMessage(t('userDeletedSuccess'));
      fetchUsers();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || t('userDeleteFailed'));
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin/approve-user/${userId}`);
      setSuccessMessage(t('userApprovedSuccess'));
      fetchUsers();
      fetchStats();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || t('userApproveFailed'));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        {t('adminDashboardTitle')}
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
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
                  {t('totalUsers')}
                </Typography>
                <Typography variant="h3">{stats.users.total}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('studentsCountStats', { count: stats.users.students })} | {t('teachersCountStats', { count: stats.users.educators ?? (stats.users.teachers + (stats.users.admins || 0)) })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {t('projects')}
                </Typography>
                <Typography variant="h3">{stats.projects.published}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('publishedCountStats', { count: stats.projects.published })} | الإجمالي الحالي: {stats.projects.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {t('pendingApproval')}
                </Typography>
                <Typography variant="h3">{stats.users.pendingApproval ?? users.filter((u) => u.role !== 'admin' && !u.isApproved).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('users')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Users Table */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('usersCount', { count: users.length })}
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('name')}</TableCell>
                <TableCell>{t('email')}</TableCell>
                <TableCell>{t('role')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role === 'admin' ? t('adminRole') : user.role === 'teacher' ? t('teacher') : t('student')}
                      color={user.role === 'admin' ? 'error' : user.role === 'teacher' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const isApprovedUser = user.role === 'admin' ? true : user.isApproved;
                      return (
                    <Chip
                      label={isApprovedUser ? t('approved') : t('pendingApproval')}
                      color={isApprovedUser ? 'success' : 'warning'}
                      size="small"
                    />
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {user.role !== 'admin' && (
                      <>
                        {!user.isApproved && (
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleApproveUser(user._id)}
                            title={t('approve')}
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary">
          تم إيقاف نظام الدعوات. إنشاء الحسابات أصبح عبر التسجيل العام فقط.
        </Typography>
      </Paper>
    </Container>
  );
}

export default AdminDashboardPage;
