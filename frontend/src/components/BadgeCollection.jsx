import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAppSettings } from '../context/AppSettingsContext';

const BadgeCollection = ({ studentId }) => {
  const { t, language } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch earned badges
      const badgesRes = await axios.get(`/api/assessment/badges/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBadges(badgesRes.data.data || []);

      // Fetch all projects to show locked badges
      const projectsRes = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllProjects(projectsRes.data.data || []);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const earnedProjectIds = badges.map(b => b.project?._id);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          {t('badgeCollectionTitle')}
        </Typography>
        <Chip
          label={`${badges.length} / ${allProjects.length}`}
          color="primary"
          icon={<TrophyIcon />}
        />
      </Box>

      {badges.length === 0 && allProjects.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          {t('noBadgesAvailableYet')}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {/* Earned Badges */}
          {badges.map((badge) => (
            <Grid item xs={12} sm={6} md={4} key={badge._id}>
              <Card
                sx={{
                  bgcolor: badge.color || 'primary.main',
                  color: 'white',
                  height: '100%',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        fontSize: '3rem',
                        mb: 1
                      }}
                    >
                      {badge.icon || '🏆'}
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      {badge.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                      {badge.description}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Chip
                      label={badge.project?.title || t('projectFallback')}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      mt: 2,
                      opacity: 0.7
                    }}
                  >
                    {t('badgeAwardedOn')}: {new Date(badge.awardedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Locked Badges */}
          {allProjects
            .filter(project => !earnedProjectIds.includes(project._id))
            .map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project._id}>
                <Card
                  sx={{
                    bgcolor: 'grey.200',
                    color: 'text.secondary',
                    height: '100%',
                    opacity: 0.6
                  }}
                >
                  <CardContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <LockIcon sx={{ fontSize: '3rem', mb: 1 }} />
                      <Typography variant="h6" fontWeight={600}>
                        {t('lockedBadgeTitle')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {t('completeProjectToUnlockBadge')}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Chip
                        label={project.title}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}
    </Paper>
  );
};

export default BadgeCollection;
