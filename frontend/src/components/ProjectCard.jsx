import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardMedia, CardActions, Typography, Button, Chip, Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useAppSettings } from '../context/AppSettingsContext';
import api from '../services/api';

const ProjectCard = ({ project, onCoverUpdated }) => {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const reduxUser = useSelector((state) => state.auth?.user);
  const [updatingCover, setUpdatingCover] = React.useState(false);
  const coverInputRef = React.useRef(null);

  const canManage = reduxUser && (reduxUser.role === 'admin' ||
    (reduxUser.role === 'teacher' && (
      project.instructor?._id === reduxUser._id ||
      project.instructor?._id === reduxUser.id ||
      project.instructor === reduxUser._id ||
      project.instructor === reduxUser.id
    ))
  );

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUpdatingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);
      await api.put(`/projects/${project._id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (onCoverUpdated) onCoverUpdated();
    } catch (err) {
      console.error('Error updating cover:', err);
    } finally {
      setUpdatingCover(false);
    }
  };
  const materialFallbackImage = project.courseMaterials?.find(
    (material) => material.thumbnail || material.fileType === 'image'
  );
  const cardImage = project.coverImage || materialFallbackImage?.thumbnail || (materialFallbackImage?.fileType === 'image' ? materialFallbackImage.fileUrl : null);

  const difficultyColor = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'error',
  };

  const difficultyLabel = {
    beginner: t('beginner'),
    intermediate: t('intermediate'),
    advanced: t('advanced'),
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        }
      }}
    >
      {/* Cover image with optional update button overlay */}
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="div"
          sx={{
            height: 180,
            background: cardImage
              ? `url(${cardImage})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {canManage && (
          <>
            <Tooltip title={t('updateThumbnail') || 'تحديث صورة الغلاف'}>
              <span style={{ position: 'absolute', top: 8, left: 8 }}>
                <IconButton
                  size="small"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={updatingCover}
                  sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
                >
                  {updatingCover ? <CircularProgress size={16} color="inherit" /> : <AddPhotoAlternateIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverChange}
            />
          </>
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={difficultyLabel[project.difficulty]} 
            size="small" 
            color={difficultyColor[project.difficulty]} 
          />
        </Box>

        <Typography gutterBottom variant="h6" component="div" fontWeight={600}>
          {project.title}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {project.shortDescription || project.description?.substring(0, 100) + '...'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon fontSize="small" />
            <span>{project.estimatedDuration} {t('hoursUnit')}</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon fontSize="small" />
            <span>{project.enrolledStudents?.length || 0}</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CodeIcon fontSize="small" />
            <span>{project.points} {t('pointsUnit')}</span>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          size="small" 
          variant="contained" 
          fullWidth
          onClick={() => navigate(`/projects/${project._id}`)}
        >
          {t('viewDetails')}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
