import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Lock as LockIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import axios from 'axios';

const StudentEvaluationStatus = ({ projectId, studentId, teamId, isTeamProject = true }) => {
  const [loading, setLoading] = useState(true);
  const [phase1Status, setPhase1Status] = useState(null);
  const [phase2Status, setPhase2Status] = useState(null);
  const [finalEval, setFinalEval] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvaluationStatus();
  }, [projectId, studentId, teamId]);

  const fetchEvaluationStatus = async () => {
    try {
      setLoading(true);

      // Fetch Phase 1 status (if team project)
      if (isTeamProject && teamId) {
        try {
          const phase1Res = await axios.get(`/api/assessment/group-status/${projectId}/${teamId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPhase1Status(phase1Res.data.data);
        } catch (err) {
          setPhase1Status({ phase1Complete: false });
        }
      } else {
        // Individual project - skip Phase 1
        setPhase1Status({ phase1Complete: true, skipped: true });
      }

      // Fetch Phase 2 status
      try {
        const phase2Res = await axios.get(`/api/assessment/individual-status/${projectId}/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPhase2Status(phase2Res.data.data);
      } catch (err) {
        setPhase2Status({ phase2Complete: false });
      }

      // Fetch Final Evaluation
      try {
        const finalRes = await axios.get(`/api/assessment/final/${projectId}/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFinalEval(finalRes.data.data);
      } catch (err) {
        setFinalEval(null);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('فشل في تحميل حالة التقييم');
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
    return <Alert severity="error">{error}</Alert>;
  }

  const activeStep = 
    finalEval ? 3 :
    phase2Status?.phase2Complete ? 2 :
    phase1Status?.phase1Complete ? 1 :
    0;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        حالة التقييم
      </Typography>

      {/* Progress Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 3 }}>
        {!phase1Status?.skipped && (
          <Step>
            <StepLabel>التقييم الجماعي</StepLabel>
          </Step>
        )}
        <Step>
          <StepLabel>التقييم الفردي والشفوي</StepLabel>
        </Step>
        <Step>
          <StepLabel>النتيجة النهائية</StepLabel>
        </Step>
      </Stepper>

      {/* Phase 1: Group Evaluation */}
      {!phase1Status?.skipped && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupsIcon sx={{ color: 'primary.contrastText', fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ color: 'primary.contrastText' }}>
                    المرحلة الأولى - التقييم الجماعي
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
                    تقييم الفريق ككل
                  </Typography>
                </Box>
              </Box>
              {phase1Status?.phase1Complete ? (
                <Chip
                  icon={<CheckCircleIcon />}
                  label="مكتمل"
                  color="success"
                />
              ) : (
                <Chip
                  icon={<HourglassEmptyIcon />}
                  label="قيد الانتظار"
                  color="warning"
                />
              )}
            </Box>
            {phase1Status?.phase1Complete && phase1Status?.latestScore !== null && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  الدرجة الجماعية:
                </Typography>
                <Typography variant="h4" color="primary">
                  {phase1Status.latestScore} / 100
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Individual Evaluation */}
      <Card sx={{ mb: 2, bgcolor: 'secondary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ color: 'secondary.contrastText', fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'secondary.contrastText' }}>
                  المرحلة الثانية - التقييم الفردي والشفوي
                </Typography>
                <Typography variant="body2" sx={{ color: 'secondary.contrastText' }}>
                  تقييم أدائك الشخصي
                </Typography>
              </Box>
            </Box>
            {!phase1Status?.phase1Complete && !phase1Status?.skipped ? (
              <Chip
                icon={<LockIcon />}
                label="محظور"
                color="error"
              />
            ) : phase2Status?.phase2Complete ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="مكتمل"
                color="success"
              />
            ) : (
              <Chip
                icon={<HourglassEmptyIcon />}
                label="قيد الانتظار"
                color="warning"
              />
            )}
          </Box>
          {phase2Status?.phase2Complete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                الدرجة الفردية:
              </Typography>
              <Typography variant="h4" color="secondary">
                {phase2Status.latestScore} / 100
              </Typography>
              {phase2Status.role && (
                <Chip
                  label={`الدور: ${phase2Status.role === 'system_designer' ? 'مصمم النظام' : 
                    phase2Status.role === 'hardware_engineer' ? 'مهندس الأجهزة' : 'المبرمج'}`}
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Final Evaluation */}
      {finalEval ? (
        <Card sx={{ bgcolor: finalEval.status === 'passed' ? 'success.light' : 'error.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrophyIcon sx={{ fontSize: 40, color: finalEval.status === 'passed' ? 'success.dark' : 'error.dark' }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    النتيجة النهائية
                  </Typography>
                  <Chip
                    label={finalEval.verbalGrade}
                    color={finalEval.status === 'passed' ? 'success' : 'error'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>
              <Chip
                label={finalEval.status === 'passed' ? 'نجح' : 'لم ينجح'}
                color={finalEval.status === 'passed' ? 'success' : 'error'}
                size="large"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                الدرجة الإجمالية:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={finalEval.finalPercentage}
                    sx={{
                      height: 20,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: finalEval.status === 'passed' ? 'success.main' : 'error.main'
                      }
                    }}
                  />
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  {finalEval.finalPercentage.toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around', mt: 3 }}>
              {!phase1Status?.skipped && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    درجة المرحلة الجماعية
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {finalEval.groupScore}
                  </Typography>
                </Box>
              )}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  درجة المرحلة الفردية
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {finalEval.individualScore}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  المجموع النهائي
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {finalEval.finalScore} / {isTeamProject ? '200' : '100'}
                </Typography>
              </Box>
            </Box>

            {finalEval.status === 'failed' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                تحتاج إلى تحقيق 60% على الأقل للنجاح. استشر معلمك للحصول على فرصة إعادة المحاولة.
              </Alert>
            )}

            {finalEval.status === 'passed' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                تهانينا! لقد نجحت في هذا المشروع وحصلت على شارة المشروع.
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          التقييم قيد المعالجة. سيتم عرض النتيجة النهائية بعد إكمال جميع المراحل.
        </Alert>
      )}
    </Paper>
  );
};

export default StudentEvaluationStatus;
