import React from 'react';
import { Card, CardContent, CardMedia, CardActions, Typography, Button, Chip, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CodeIcon from '@mui/icons-material/Code';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const difficultyColor = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'error',
  };

  const difficultyLabel = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
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
      <CardMedia
        component="div"
        sx={{
          height: 180,
          background: project.coverImage 
            ? `url(${project.coverImage})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={difficultyLabel[project.difficulty]} 
            size="small" 
            color={difficultyColor[project.difficulty]} 
          />
          <Chip 
            label={project.category} 
            size="small" 
            variant="outlined"
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
            <span>{project.estimatedDuration} ساعة</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon fontSize="small" />
            <span>{project.enrolledStudents?.length || 0}</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CodeIcon fontSize="small" />
            <span>{project.points} نقطة</span>
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
          عرض التفاصيل
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
