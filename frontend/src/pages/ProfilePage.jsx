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

const ProfilePage = () => {
  const dispatch = useDispatch();
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
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    fetchUserStats();
    if (user?.role === 'student') {
      fetchBadges();
    }
  }, [user]);

  const fetchBadges = async () => {
    try {
      const response = await assessmentAPI.getStudentBadges(user._id);
      setBadges(response.data.data);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

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
      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('Error updating profile:', error);
      setUploadingAvatar(false);
      toast.error(error.response?.data?.message || 'فشل تحديث الملف الشخصي');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('يجب اختيار صورة فقط');
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
      alert('كلمة المرور الجديدة غير متطابقة');
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
      admin: { label: 'مسؤول', color: 'error' },
      teacher: { label: 'معلم', color: 'primary' },
      student: { label: 'طالب', color: 'success' }
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
                  label="مفعل 2FA" 
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
                تعديل الملف الشخصي
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
                تغيير كلمة المرور
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
                    مشاريع مكتملة
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
                    مشاريع جارية
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
                    إجمالي النقاط
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
                    الترتيب
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Badges Section */}
        {user?.role === 'student' && badges.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
                الشارات المكتسبة
              </Typography>
              <Grid container spacing={2}>
                {badges.map((badge) => (
                  <Grid item xs={12} sm={6} md={4} key={badge._id}>
                    <Card 
                      elevation={0} 
                      sx={{ 
                        borderRadius: 2, 
                        border: '2px solid', 
                        borderColor: badge.color || '#FFD700',
                        bgcolor: `${badge.color || '#FFD700'}15`,
                        textAlign: 'center',
                        p: 2
                      }}
                    >
                      <Box sx={{ fontSize: 48, mb: 1 }}>
                        {badge.icon || '🏆'}
                      </Box>
                      <Typography variant="h6" fontWeight={600}>
                        {badge.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {badge.description}
                      </Typography>
                      <Chip 
                        label={badge.project?.title} 
                        size="small" 
                        sx={{ bgcolor: 'primary.main', color: 'white' }}
                      />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                        {new Date(badge.awardedAt).toLocaleDateString('ar-EG')}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', height: '100%' }}>
            <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
              المعلومات الشخصية
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Email color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="البريد الإلكتروني"
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
                  primary="رقم الهاتف"
                  secondary={user?.phone || 'غير مسجل'}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemIcon>
                  <School color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="الدور"
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
                  primary="تاريخ التسجيل"
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
              الأمان والإعدادات
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="التحقق من البريد الإلكتروني"
                  secondary={user?.emailVerified ? 'مفعل ✓' : 'غير مفعل'}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.emailVerified ? (
                  <Chip label="مفعل" color="success" size="small" />
                ) : (
                  <Chip label="غير مفعل" color="error" size="small" />
                )}
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemText 
                  primary="المصادقة الثنائية (2FA)"
                  secondary={user?.twoFactorEnabled ? 'مفعل ✓' : 'غير مفعل'}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.twoFactorEnabled ? (
                  <Chip label="مفعل" color="success" size="small" />
                ) : (
                  <Chip label="غير مفعل" color="warning" size="small" />
                )}
              </ListItem>
              <Divider component="li" />
              <ListItem>
                <ListItemText 
                  primary="الموافقة على الحساب"
                  secondary={user?.isApproved ? 'تمت الموافقة ✓' : 'في انتظار الموافقة'}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {user?.isApproved ? (
                  <Chip label="موافق عليه" color="success" size="small" />
                ) : (
                  <Chip label="معلق" color="warning" size="small" />
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
          تعديل الملف الشخصي
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
                  {uploadingAvatar ? 'جاري الرفع...' : 'تغيير الصورة الشخصية'}
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
              label="الاسم"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={uploadingAvatar}>
            إلغاء
          </Button>
          <Button 
            variant="contained" 
            onClick={handleEditProfile}
            sx={{ fontWeight: 600 }}
            disabled={uploadingAvatar}
            startIcon={uploadingAvatar ? <CircularProgress size={20} /> : null}
          >
            {uploadingAvatar ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
          تغيير كلمة المرور
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="كلمة المرور الحالية"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="كلمة المرور الجديدة"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              margin="normal"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="تأكيد كلمة المرور الجديدة"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPasswordDialogOpen(false)}>إلغاء</Button>
          <Button 
            variant="contained" 
            onClick={handleChangePassword}
            sx={{ fontWeight: 600 }}
          >
            تغيير كلمة المرور
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;
