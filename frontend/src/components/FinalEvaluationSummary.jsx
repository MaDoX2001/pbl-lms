import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import axios from 'axios';

const VERBAL_GRADES = {
  'ممتاز': { color: '#4caf50', threshold: 85 },
  'جيد جدًا': { color: '#8bc34a', threshold: 75 },
  'جيد': { color: '#ffc107', threshold: 65 },
  'مقبول': { color: '#ff9800', threshold: 60 },
  'غير مجتاز': { color: '#f44336', threshold: 0 }
};

const FinalEvaluationSummary = ({ projectId, studentId, showActions = false, onRetryAllowed }) => {
  const [loading, setLoading] = useState(true);
  const [finalEval, setFinalEval] = useState(null);
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [projectId, studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [finalRes, projectRes] = await Promise.all([
        axios.get(`/api/assessment/final/${projectId}/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setFinalEval(finalRes.data.data);
      setProject(projectRes.data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError('التقييم النهائي غير متوفر بعد');
      } else {
        setError(err.response?.data?.message || 'فشل في تحميل التقييم النهائي');
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="info">{error}</Alert>;
  }

  if (!finalEval) {
    return <Alert severity="warning">لم يتم إنهاء التقييم بعد</Alert>;
  }

  const verbalGradeColor = VERBAL_GRADES[finalEval.verbalGrade]?.color || '#757575';
  const isPassed = finalEval.status === 'passed';

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          التقييم النهائي
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isPassed ? (
            <>
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 32 }} />
              <Chip label="نجح" color="success" size="large" />
            </>
          ) : (
            <>
              <CancelIcon sx={{ color: 'error.main', fontSize: 32 }} />
              <Chip label="لم ينجح" color="error" size="large" />
            </>
          )}
        </Box>
      </Box>

      {/* Attempt Number */}
      {finalEval.attemptNumber > 1 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          المحاولة رقم: {finalEval.attemptNumber}
        </Alert>
      )}

      {/* Score Breakdown */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Group Score (if team project) */}
        {project?.isTeamProject && (
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'primary.light', height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="primary.contrastText">
                  المرحلة الجماعية
                </Typography>
                <Typography variant="h3" fontWeight={700} color="primary.contrastText">
                  {finalEval.groupScore}
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  من 100
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Individual Score */}
        <Grid item xs={12} md={project?.isTeamProject ? 4 : 6}>
          <Card sx={{ bgcolor: 'secondary.light', height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="secondary.contrastText">
                المرحلة الفردية والشفوية
              </Typography>
              <Typography variant="h3" fontWeight={700} color="secondary.contrastText">
                {finalEval.individualScore}
              </Typography>
              <Typography variant="body2" color="secondary.contrastText">
                من 100
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Final Score */}
        <Grid item xs={12} md={project?.isTeamProject ? 4 : 6}>
          <Card sx={{ bgcolor: verbalGradeColor, height: '100%' }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'white' }}>
                الدرجة النهائية
              </Typography>
              <Typography variant="h3" fontWeight={700} sx={{ color: 'white' }}>
                {finalEval.finalScore}
              </Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>
                من 200
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Percentage & Verbal Grade */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          النسبة المئوية
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={finalEval.finalPercentage}
              sx={{
                height: 20,
                borderRadius: 2,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: verbalGradeColor
                }
              }}
            />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {finalEval.finalPercentage.toFixed(2)}%
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Chip
            label={finalEval.verbalGrade}
            sx={{
              bgcolor: verbalGradeColor,
              color: 'white',
              fontSize: '1.2rem',
              height: 48,
              px: 3,
              fontWeight: 600
            }}
          />
        </Box>
      </Box>

      {/* Pass Threshold Info */}
      <Alert severity={isPassed ? 'success' : 'error'} sx={{ mb: 2 }}>
        <Typography variant="body2">
          {isPassed
            ? `تجاوز الطالب نسبة النجاح المطلوبة (60%)`
            : `لم يتجاوز الطالب نسبة النجاح المطلوبة (60%). الدرجة الحالية: ${finalEval.finalPercentage.toFixed(2)}%`}
        </Typography>
      </Alert>

      {/* Badge Info */}
      {isPassed && (
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
          <TrophyIcon sx={{ fontSize: 48, color: 'success.dark', mb: 1 }} />
          <Typography variant="h6" color="success.dark" fontWeight={600}>
            تم منح شارة المشروع
          </Typography>
        </Box>
      )}

      {/* Retry Option (for teachers) */}
      {showActions && !isPassed && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="warning"
            onClick={onRetryAllowed}
          >
            السماح بإعادة المحاولة
          </Button>
        </Box>
      )}

      {/* Calculation Explanation */}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          طريقة الحساب:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {project?.isTeamProject ? (
            <>
              الدرجة النهائية = درجة المرحلة الجماعية + درجة المرحلة الفردية والشفوية<br />
              {finalEval.groupScore} + {finalEval.individualScore} = {finalEval.finalScore} من 200<br />
              النسبة المئوية = ({finalEval.finalScore} / 200) × 100 = {finalEval.finalPercentage.toFixed(2)}%
            </>
          ) : (
            <>
              الدرجة النهائية = درجة المرحلة الفردية والشفوية<br />
              {finalEval.individualScore} من 100<br />
              النسبة المئوية = ({finalEval.individualScore} / 100) × 100 = {finalEval.finalPercentage.toFixed(2)}%
            </>
          )}
        </Typography>
      </Box>
    </Paper>
  );
};

export default FinalEvaluationSummary;
