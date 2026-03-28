import React, { useState, useEffect, useMemo } from 'react';
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
  Tab,
  Tooltip
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
  const [teams, setTeams] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const studentsInTeams = useMemo(() => {
    const memberIds = new Set();
    (teams || []).forEach((team) => {
      (team.members || []).forEach((member) => {
        const memberId = member?.user?._id || member?._id || member;
        if (memberId) {
          memberIds.add(String(memberId));
        }
      });
    });
    return memberIds;
  }, [teams]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aPending = a.role !== 'admin' && !a.isApproved;
      const bPending = b.role !== 'admin' && !b.isApproved;

      if (aPending === bPending) return 0;
      return aPending ? -1 : 1;
    });
  }, [users]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchTeams();
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

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;
    
    try {
      await api.delete(`/admin/users/${userId}`);
      setSuccessMessage(t('userDeletedSuccess'));
      fetchUsers();
      fetchTeams();
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
              {sortedUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {user.role === 'student' && (
                        <Tooltip
                          title={
                            studentsInTeams.has(String(user._id))
                              ? 'تم وضع الطالب في فريق'
                              : 'الطالب غير موجود في فريق'
                          }
                        >
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: studentsInTeams.has(String(user._id)) ? 'success.main' : 'warning.main',
                              flexShrink: 0,
                            }}
                          />
                        </Tooltip>
                      )}
                      <Typography variant="body2">{user.name}</Typography>
                    </Box>
                  </TableCell>
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
