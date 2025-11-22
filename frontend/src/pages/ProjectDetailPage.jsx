import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Avatar,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { enrollInProject } from '../redux/slices/projectSlice';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentProject: project, loading } = useSelector((state) => state.projects);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchProjectById(id));
  }, [dispatch, id]);

  const handleEnroll = () => {
    dispatch(enrollInProject(id));
  };

  if (loading || !project) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isEnrolled = user?.enrolledProjects?.includes(project._id);
  const difficultyLabel = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 4, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          {project.title}
        </Typography>
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
          {project.shortDescription || project.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={difficultyLabel[project.difficulty]} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={project.category} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          {project.technologies?.map((tech, i) => (
            <Chip key={i} label={tech} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon />
            <span>{project.estimatedDuration} ساعة</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon />
            <span>{project.points} نقطة</span>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              نظرة عامة
            </Typography>
            <Typography variant="body1" paragraph>
              {project.description}
            </Typography>
          </Paper>

          {/* Objectives */}
          {project.objectives?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                أهداف التعلم
              </Typography>
              <List>
                {project.objectives.map((obj, index) => (
                  <ListItem key={index}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <ListItemText primary={obj} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Milestones */}
          {project.milestones?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                المراحل
              </Typography>
              <List>
                {project.milestones.map((milestone, index) => (
                  <Box key={index}>
                    <ListItem>
                      <ListItemText
                        primary={`${index + 1}. ${milestone.title}`}
                        secondary={milestone.description}
                      />
                      <Chip label={`${milestone.points} نقطة`} size="small" color="primary" />
                    </ListItem>
                    {index < project.milestones.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {/* Resources */}
          {project.resources?.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                مصادر التعلم
              </Typography>
              <List>
                {project.resources.map((resource, index) => (
                  <ListItem key={index} component="a" href={resource.url} target="_blank">
                    <ListItemText
                      primary={resource.title}
                      secondary={resource.description}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Enrollment Card */}
          <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            {isAuthenticated ? (
              isEnrolled ? (
                <Button variant="contained" fullWidth size="large" disabled>
                  مسجل بالفعل
                </Button>
              ) : (
                <Button variant="contained" fullWidth size="large" onClick={handleEnroll}>
                  التسجيل في المشروع
                </Button>
              )
            ) : (
              <Button variant="contained" fullWidth size="large" href="/login">
                سجل الدخول للتسجيل
              </Button>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Instructor */}
            {project.instructor && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  المدرس
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar src={project.instructor.avatar} />
                  <Typography variant="body1">{project.instructor.name}</Typography>
                </Box>
              </Box>
            )}

            {/* Stats */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              الإحصائيات
            </Typography>
            <Typography variant="body2" paragraph>
              عدد الطلاب المسجلين: {project.enrolledStudents?.length || 0}
            </Typography>
            <Typography variant="body2">
              أكمل المشروع: {project.completedBy?.length || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProjectDetailPage;
