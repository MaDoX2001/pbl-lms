import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Avatar, 
  Grid, 
  Card, 
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import { 
  Email, 
  Phone, 
  School, 
  CalendarToday, 
  Edit,
  Lock,
  Assignment,
  TrendingUp,
  EmojiEvents,
  Verified,
  PhotoCamera
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import api from '../services/api';
import { assessmentAPI } from '../services/api';
import { toast } from 'react-toastify';
import StudentLevelBadge from '../components/StudentLevelBadge';
import BadgeCollection from '../components/BadgeCollection';
import { useAppSettings } from '../context/AppSettingsContext';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { t } = useAppSettings();
  const { user } = useSelector((state) => state.auth);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    completedProjects: 0,
    inProgressProjects: 0,
    totalPoints: 0,
    rank: 0
  });
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  // Update form data when user changes (after profile update)
  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar || ''
    });
    setAvatarPreview(user?.avatar || null);
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Fetch user statistics (you'll need to create these endpoints)
      const response = await api.get('/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleEditProfile = async () => {
    try {
      let avatarUrl = formData.avatar;

      // Upload avatar if new file selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', avatarFile);

        const uploadResponse = await api.post('/users/upload-avatar', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        avatarUrl = uploadResponse.data.url;
      }

      const response = await api.put('/users/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        avatar: avatarUrl
      });
      
      // Update Redux store with new user data
      dispatch(updateUser(response.data.data));
      setEditDialogOpen(false);
      setAvatarFile(null);
      setUploadingAvatar(false);
      toast.success(t('profileUpdatedSuccess'));
    } catch (error) {
      console.error('Error updating profile:', error);
      setUploadingAvatar(false);
      toast.error(error.response?.data?.message || t('profileUpdateFailed'));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('avatarSizeLimit'));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('avatarImageOnly'));
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('newPasswordMismatch'));
      return;
    }
    try {
      await api.put('/users/change-password', passwordData);
      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { label: t('adminRole'), color: 'error' },
      teacher: { label: t('teacher'), color: 'primary' },
      student: { label: t('student'), color: 'success' }
    };
    return roleConfig[role] || { label: role, color: 'default' };
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', py: 4 }}>
      {/* Header Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 3
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={user?.avatar}
              sx={{ 
                width: 120, 
                height: 120,
                bgcolor: 'white',
                color: 'primary.main',
                fontSize: '3rem',
                fontWeight: 700,
                border: '4px solid rgba(255,255,255,0.3)'
              }}
            >
              {!user?.avatar && user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Typography variant="h3" fontWeight={700}>
                {user?.name}
              </Typography>
              {user?.emailVerified && (
                <Verified sx={{ fontSize: 32, color: '#4caf50' }} />
              )}
              {user?.role === 'student' && (
                <StudentLevelBadge studentId={user._id} compact={true} />
              )}
            </Box>
            <Box display="flex" gap={1} mb={2}>
              <Chip 
                label={getRoleBadge(user?.role).label} 
                color={getRoleBadge(user?.role).color}
                sx={{ fontWeight: 600 }}
              />
              {user?.twoFactorEnabled && (
                <Chip 
                  icon={<Lock />}
                  label={t('twoFactorEnabledBadge')} 
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
            <Box display="flex" gap={2}>
              <Button 
                variant="contained" 
                startIcon={<Edit />}
                onClick={() => {
                  setFormData({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: user?.phone || '',
                    avatar: user?.avatar || ''
                  });
                  setAvatarPreview(user?.avatar || null);
                  setAvatarFile(null);
                  setEditDialogOpen(true);
                }}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                {t('editProfile')}
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Lock />}
                onClick={() => setPasswordDialogOpen(true)}
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  fontWeight: 600,
                  '&:hover': { 
                    borderColor: 'white', 
                    bgcolor: 'rgba(255,255,255,0.1)' 
                  }
                }}
              >
                {t('changePassword')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {user?.role === 'student' && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Assignment sx={{ fontSize: 48, color: '#667eea', mb: 1 }} />
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    {stats.completedProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {t('completedProjects')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <TrendingUp sx={{ fontSize: 48, color: '#f59e0b', mb: 1 }} />
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    {stats.inProgressProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {t('ongoingProjects')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <EmojiEvents sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    {stats.totalPoints}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {t('totalPoints')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <School sx={{ fontSize: 48, color: '#ef4444', mb: 1 }} />
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    #{stats.rank}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {t('rank')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Badges Section with BadgeCollection Component */}
        {user?.role === 'student' && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
                {t('achievements')}
              </Typography>
              <BadgeCollection studentId={user._id} />
            </Paper>
          </Grid>
        )}

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', height: '100%' }}>
            <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
              {t('personalInfo')}
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Email color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={t('email')}
                  secondary={user?.email}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <Phone color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={t('phoneNumber')}
                  secondary={user?.phone || t('notRegistered')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <School color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={t('role')}
                  secondary={getRoleBadge(user?.role).label}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <CalendarToday color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={t('registrationDate')}
                  secondary={new Date(user?.createdAt).toLocaleDateString('ar-EG')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Security & Settings */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', height: '100%' }}>
            <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
              {t('securityAndSettings')}
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary={t('emailVerification')}
                  secondary={user?.emailVerified ? t('enabledCheck') : t('disabled')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.emailVerified ? (
                  <Chip label={t('enabled')} color="success" size="small" />
                ) : (
                  <Chip label={t('disabled')} color="error" size="small" />
                )}
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemText 
                  primary={t('twoFactorTitle')}
                  secondary={user?.twoFactorEnabled ? t('enabledCheck') : t('disabled')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.twoFactorEnabled ? (
                  <Chip label={t('enabled')} color="success" size="small" />
                ) : (
                  <Chip label={t('disabled')} color="warning" size="small" />
                )}
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemText 
                  primary={t('accountApproval')}
                  secondary={user?.isApproved ? t('approvedCheck') : t('pendingApproval')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.isApproved ? (
                  <Chip label={t('approved')} color="success" size="small" />
                ) : (
                  <Chip label={t('pending')} color="warning" size="small" />
                )}
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
          {t('editProfile')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Avatar Upload Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={avatarPreview || user?.avatar}
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mb: 2,
                  border: '3px solid #1976d2'
                }}
              >
                {!avatarPreview && user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="avatar-upload"
                type="file"
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? t('uploading') : t('changeAvatar')}
                </Button>
              </label>
              {avatarFile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {avatarFile.name}
                </Typography>
              )}
            </Box>

            <TextField
              fullWidth
              label={t('fullName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('email')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('phoneNumber')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={uploadingAvatar}>
            {t('cancel')}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditProfile}
            sx={{ fontWeight: 600 }}
            disabled={uploadingAvatar}
            startIcon={uploadingAvatar ? <CircularProgress size={20} /> : null}
          >
            {uploadingAvatar ? t('saving') : t('saveChanges')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
          {t('changePassword')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label={t('currentPassword')}
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label={t('newPassword')}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label={t('confirmNewPassword')}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>{t('cancel')}</Button>
          <Button 
            variant="contained" 
            onClick={handleChangePassword}
            sx={{ fontWeight: 600 }}
          >
            {t('changePassword')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
