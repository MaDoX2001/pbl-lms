import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAppSettings } from '../context/AppSettingsContext';

const getLevelInfo = (t) => ({
  beginner: {
    label: t('beginner'),
    color: '#4caf50',
    icon: '🌱',
    projects: t('levelProjectsBeginner')
  },
  intermediate: {
    label: t('intermediate'),
    color: '#2196f3',
    icon: '📘',
    projects: t('levelProjectsIntermediate')
  },
  advanced: {
    label: t('advanced'),
    color: '#ff9800',
    icon: '🎓',
    projects: t('levelProjectsAdvanced')
  },
  expert: {
    label: t('expertLevel'),
    color: '#9c27b0',
    icon: '🏆',
    projects: t('levelProjectsExpert')
  }
});

const StudentLevelBadge = ({ studentId, compact = false }) => {
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [studentLevel, setStudentLevel] = useState(null);

  useEffect(() => {
    fetchStudentLevel();
  }, [studentId]);

  const fetchStudentLevel = async () => {
    try {
      const response = await axios.get(`/api/assessment/student-level/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudentLevel(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!studentLevel) {
    return null;
  }

  const LEVEL_INFO = getLevelInfo(t);
  const levelInfo = LEVEL_INFO[studentLevel.currentLevel] || LEVEL_INFO.beginner;

  if (compact) {
    return (
      <Tooltip title={`${levelInfo.label} - ${levelInfo.projects}`}>
        <Chip
          icon={<span style={{ fontSize: '1.2em' }}>{levelInfo.icon}</span>}
          label={levelInfo.label}
          sx={{
            bgcolor: levelInfo.color,
            color: 'white',
            fontWeight: 600
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Paper sx={{ p: 3, bgcolor: levelInfo.color, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ fontSize: '3rem' }}>
          {levelInfo.icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {levelInfo.label}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {levelInfo.projects}
          </Typography>
        </Box>
      </Box>

      {/* Progress Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            {t('completedProjects')}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {studentLevel.completedProjects?.length || 0}
          </Typography>
        </Box>
        
        {studentLevel.completedProjects && studentLevel.completedProjects.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {t('highestScore')}: {Math.max(...studentLevel.completedProjects.map(p => p.finalScore)).toFixed(1)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Level Progress Hint */}
      {studentLevel.currentLevel !== 'expert' && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            <TrendingUpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            {t('completeHigherProjectForUpgrade')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default StudentLevelBadge;
