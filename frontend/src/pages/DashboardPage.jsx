import React, { useEffect } from 'react';
import { Box, Typography, Paper, Grid, Avatar, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Divider } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchStudentProgress } from '../redux/slices/progressSlice';
import { useAppSettings } from '../context/AppSettingsContext';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StudentEvaluationStatus from '../components/StudentEvaluationStatus';

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, language } = useAppSettings();
  const { user } = useSelector((state) => state.auth);
  const { studentProgress } = useSelector((state) => state.progress);

  useEffect(() => {
    if (user) {
      dispatch(fetchStudentProgress(user.id));
    }
  }, [dispatch, user]);

  const inProgressProjects = studentProgress.filter(p => p.status === 'in-progress');
  const completedProjects = studentProgress.filter(p => p.status === 'completed');

  return (
    <Box>
      <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
        {t('welcomeUser', { name: user?.name || '' })}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('progressSubtitle')}
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <EmojiEventsIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {user?.points || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pointsEarned')}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
              <TrendingUpIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {t('levelLabel', { level: user?.level || 1 })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('currentLevel')}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
              <AssignmentIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {completedProjects.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('completedProjects')}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* In Progress Projects */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          {t('ongoingProjects')}
        </Typography>
        {inProgressProjects.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {t('noOngoingProjects')} <a href="/projects">{t('availableProjects')}</a>
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {inProgressProjects.map((progress) => {
              // Add null guards
              if (!progress || !progress.project || !progress.project._id) {
                return null;
              }
              
              return (
              <Grid item xs={12} key={progress._id}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {progress.project?.title || t('untitledProject')}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        {progress.completionPercentage || 0}%
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress.completionPercentage || 0} 
                        sx={{ mb: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {t('lastActivity', {
                          date: progress.lastActivityAt
                            ? new Date(progress.lastActivityAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                            : t('notAvailable')
                        })}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {t('evalStatus')}
                    </Typography>
                    <StudentEvaluationStatus 
                      projectId={progress.project._id}
                      studentId={user._id}
                      isTeamProject={progress.project.isTeamProject}
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('doneProjects')}
          </Typography>
          <Grid container spacing={2}>
            {completedProjects.map((progress) => (
              <Grid item xs={12} sm={6} md={4} key={progress._id}>
                <Paper 
                  sx={{ 
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 4 }
                  }}
                  onClick={() => navigate(`/projects/${progress.project._id}`)}
                >
                  <Typography variant="h6" gutterBottom>
                    {progress.project.title}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmojiEventsIcon fontSize="small" />
                    {t('points', { points: progress.pointsEarned })}
                  </Typography>
                  {progress.feedback?.score && (
                    <Typography variant="body2" color="text.secondary">
                      {t('score', { score: progress.feedback.score })}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Achievements */}
      {user?.achievements?.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('achievements')}
          </Typography>
          <Grid container spacing={2}>
            {user.achievements.map((achievement, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h3">{achievement.icon || '🏆'}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {achievement.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {achievement.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default DashboardPage;
