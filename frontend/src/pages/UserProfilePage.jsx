import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Email,
  Phone,
  School,
  CalendarToday,
  ArrowBack as ArrowBackIcon,
  Assignment,
  TrendingUp,
  EmojiEvents,
  Verified,
  ChatBubble as ChatBubbleIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * UserProfilePage Component
 * 
 * View public profile of other users
 * Access controlled by backend:
 * - Students can see: team members + teachers/admins
 * - Teachers/Admins can see: everyone
 */
const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { t, language } = useAppSettings();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    completedProjects: 0,
    inProgressProjects: 0,
    totalPoints: 0,
    rank: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch public profile
      const response = await api.get(`/users/${userId}/public`);
      setUser(response.data.data);

      // Fetch stats (optional - might need separate endpoint)
      try {
        const statsResponse = await api.get(`/users/${userId}/stats`);
        setStats(statsResponse.data);
      } catch (err) {
        console.log('Stats not available for this user');
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || t('profileLoadFailed'));
      toast.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error(t('pleaseWriteMessage'));
      return;
    }

    setSendingMessage(true);
    try {
      // Create or get conversation
      const convResponse = await api.post('/chat/conversations/direct', { userId });
      const conversation = convResponse.data.data;

      // Send message
      await api.post(`/chat/conversations/${conversation._id}/messages`, {
        content: messageText,
        type: 'text'
      });

      toast.success(t('messageSentSuccess'));
      setMessageDialogOpen(false);
      setMessageText('');
      
      // Navigate to chat page
      navigate('/chat');
    } catch (err) {
      toast.error(t('sendMessageFailed'));
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      student: { label: t('student'), color: 'info' },
      teacher: { label: t('teacher'), color: 'warning' },
      admin: { label: t('adminRole'), color: 'error' }
    };
    return roleConfig[role] || { label: role, color: 'default' };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          {t('back')}
        </Button>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          {t('back')}
        </Button>
        <Alert severity="warning">{t('userNotFound')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        {t('back')}
      </Button>

      {/* Profile Header */}
      <Paper
        elevation={3}
        sx={{
          background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          color: 'white',
          p: 4,
          mb: 3,
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
              {/* Message Button - only show if viewing someone else's profile */}
              {currentUser?.id !== userId && (
                <IconButton
                  onClick={() => setMessageDialogOpen(true)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  <ChatBubbleIcon />
                </IconButton>
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
                  label="2FA"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Cards for Students */}
      {user?.role === 'student' && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
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
        </Grid>
      )}

      {/* Contact Information */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0', mb: 3 }}>
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
              <CalendarToday color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={t('registrationDate')}
              secondary={new Date(user?.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG')}
              primaryTypographyProps={{ fontWeight: 600 }}
            />
          </ListItem>
        </List>
      </Paper>

      {/* Completed Projects */}
      {user?.completedProjects && user?.completedProjects.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
          <Typography variant="h5" fontWeight={700} mb={3} color="text.primary">
            {t('completedProjects')} ({user?.completedProjects.length})
          </Typography>
          <Grid container spacing={2}>
            {user?.completedProjects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom fontWeight={700}>
                      {project.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {project.description}
                    </Typography>
                    <Chip
                      label={t('points', { points: project.points })}
                      color="success"
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Send Message Dialog */}
      <Dialog 
        open={messageDialogOpen} 
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('sendMessageTo', { name: user?.name })}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            placeholder={t('writeYourMessageHere')}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={sendingMessage}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setMessageDialogOpen(false)}
            disabled={sendingMessage}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleSendMessage}
            variant="contained"
            disabled={sendingMessage || !messageText.trim()}
            startIcon={sendingMessage ? <CircularProgress size={20} /> : <ChatBubbleIcon />}
          >
            {t('send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfilePage;
