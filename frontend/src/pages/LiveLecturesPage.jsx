import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  VideocamOutlined,
  PersonOutline,
  AccessTimeOutlined,
  AddCircleOutline,
  LinkOutlined,
  DeleteOutline
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAppSettings } from '../context/AppSettingsContext';

const LiveLecturesPage = () => {
  const { user } = useSelector((state) => state.auth);
  const { t } = useAppSettings();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingLink: '',
    scheduledTime: ''
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/lectures');
      setLectures(response.data.data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast.error(t('loadLecturesFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLecture = async () => {
    try {
      await api.post('/lectures', formData);
      toast.success(t('lectureCreatedSuccess'));
      setOpenDialog(false);
      setFormData({ title: '', description: '', meetingLink: '', scheduledTime: '' });
      fetchLectures();
    } catch (error) {
      console.error('Error creating lecture:', error);
      toast.error(t('lectureCreateFailed'));
    }
  };

  const handleDeleteLecture = async (id) => {
    if (!window.confirm(t('confirmDeleteLecture'))) return;
    
    try {
      await api.delete(`/lectures/${id}`);
      toast.success(t('lectureDeletedSuccess'));
      fetchLectures();
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast.error(t('lectureDeleteFailed'));
    }
  };

  const handleJoinLecture = (link) => {
    window.open(link, '_blank');
  };

  const getLectureStatus = (scheduledTime) => {
    const now = new Date();
    const lectureTime = new Date(scheduledTime);
    const diffMinutes = (lectureTime - now) / (1000 * 60);

    if (diffMinutes < -60) return { label: t('ended'), color: 'default' };
    if (diffMinutes < 0) return { label: t('liveNow'), color: 'success' };
    if (diffMinutes < 30) return { label: t('startingSoon'), color: 'warning' };
    return { label: t('scheduled'), color: 'info' };
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
            {t('liveLectures')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('liveLecturesSubtitle')}
          </Typography>
        </Box>
        {isTeacher && (
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={() => setOpenDialog(true)}
            sx={{ minWidth: 150 }}
          >
            {t('createLecture')}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : lectures.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            border: '2px dashed #ddd'
          }}
        >
          <VideocamOutlined sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('noLecturesAvailable')}
          </Typography>
          {isTeacher && (
            <Button
              variant="contained"
              startIcon={<AddCircleOutline />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              {t('createNewLecture')}
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {lectures.map((lecture) => {
            const status = getLectureStatus(lecture.scheduledTime);
            return (
              <Grid item xs={12} md={6} key={lecture._id}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'translateY(-4px)'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                      {isTeacher && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteLecture(lecture._id)}
                        >
                          <DeleteOutline />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {lecture.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      {lecture.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonOutline fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {lecture.instructor?.name || t('teacher')}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTimeOutlined fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(lecture.scheduledTime)}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<LinkOutlined />}
                      onClick={() => handleJoinLecture(lecture.meetingLink)}
                      disabled={status.label === t('ended')}
                      sx={{
                        bgcolor: status.label === t('liveNow') ? '#4caf50' : 'primary.main',
                        '&:hover': {
                          bgcolor: status.label === t('liveNow') ? '#45a049' : 'primary.dark'
                        }
                      }}
                    >
                      {status.label === t('liveNow') ? t('joinNow') : t('openLink')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Lecture Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createNewLecture')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label={t('lectureTitle')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={t('lectureDescription')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label={t('meetingLinkLabel')}
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              margin="normal"
              required
              placeholder={t('meetingLinkPlaceholder')}
            />
            <TextField
              fullWidth
              label={t('lectureScheduleTime')}
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreateLecture}
            disabled={!formData.title || !formData.meetingLink || !formData.scheduledTime}
          >
            {t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveLecturesPage;
