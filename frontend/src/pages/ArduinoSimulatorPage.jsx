import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert, CircularProgress, Tooltip, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

function ArduinoSimulatorPage() {
  const { t } = useAppSettings();
  const { user } = useSelector(state => state.auth);

  const stageOptions = [
    { value: 'design', label: 'تسليم التصميم' },
    { value: 'wiring', label: 'تسليم التوصيل' },
    { value: 'programming', label: 'تسليم البرمجة (لكل طالب)' },
    { value: 'testing', label: 'تسليم الاختبار' },
    { value: 'final_delivery', label: 'التسليم النهائي' },
  ];

  // Dialog state
  const [open, setOpen] = useState(false);
  const [wokwiLink, setWokwiLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStage, setSelectedStage] = useState('design');
  const [projects, setProjects] = useState([]);   // team enrollments
  const [teamId, setTeamId] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [progressByProject, setProgressByProject] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [historyByProject, setHistoryByProject] = useState({});
  const [loadingQuickLinks, setLoadingQuickLinks] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const roleLabelMap = {
    system_designer: 'مصمم النظام',
    hardware_engineer: 'مهندس التوصيل',
    tester: 'مختبر',
  };

  const stageLabelMap = {
    design: 'مرحلة التصميم',
    wiring: 'مرحلة التوصيل',
    programming: 'مرحلة البرمجة',
    testing: 'مرحلة الاختبار',
    final_delivery: 'مرحلة التسليم النهائي',
    completed: 'تم إنهاء كل مراحل التسليم',
  };

  const getCurrentStage = (progress) => {
    const completed = progress?.completed || {};
    if (!completed.design) return 'design';
    if (!completed.wiring) return 'wiring';
    if (!completed.programming) return 'programming';
    if (!completed.testing) return 'testing';
    if (!completed.final_delivery) return 'final_delivery';
    return 'completed';
  };

  const selectedEnrollment = projects.find((e) => String(e.project?._id || e._id) === String(selectedProject));
  const myProjectRole = (() => {
    const memberRoles = selectedEnrollment?.memberRoles || [];
    const mine = memberRoles.find((mr) => String(mr.user?._id || mr.user) === String(user?._id));
    return mine?.role || null;
  })();
  const currentStageKey = selectedProject ? getCurrentStage(progressByProject[selectedProject]) : null;
  const currentHistory = historyByProject[selectedProject] || [];

  const getLatestStageSubmission = (stageKey) => {
    return currentHistory.find((submission) => submission.stageKey === stageKey) || null;
  };

  const getLatestProgrammingSubmissionByStudent = (studentId) => {
    return currentHistory.find(
      (submission) => submission.stageKey === 'programming'
        && String(submission.submittedBy?._id || submission.submittedBy) === String(studentId)
    ) || null;
  };

  const latestDesigner = getLatestStageSubmission('design');
  const latestWiring = getLatestStageSubmission('wiring');
  const latestTesting = getLatestStageSubmission('testing');
  const hasAnyQuickLink = !!(
    latestDesigner?.wokwiLink
    || latestWiring?.wokwiLink
    || latestTesting?.wokwiLink
    || (teamMembers || []).some((member) => {
      const memberUser = member.user || member;
      const memberId = memberUser?._id || memberUser;
      return !!getLatestProgrammingSubmissionByStudent(memberId)?.wokwiLink;
    })
  );

  const simulatorHeight = showQuickLinks
    ? { xs: '62vh', md: 'calc(100vh - 300px)' }
    : { xs: '74vh', md: 'calc(100vh - 210px)' };

  const openWokwiLink = (link, label) => {
    if (!link) {
      setSnack({ open: true, msg: `لا يوجد رابط محفوظ لـ ${label}`, severity: 'warning' });
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Fetch team's enrolled projects for the dropdown
  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/teams/my-team').then(res => {
        const teamId = res.data.data._id;
        setTeamId(teamId);
        setTeamMembers(res.data.data?.members || []);
          api.get('/team-projects/my-team').then(r => {
            const enrollments = r.data.data || [];
            setProjects(enrollments);
            if (enrollments.length > 0) {
              setSelectedProject(enrollments[0].project?._id || enrollments[0]._id);
            }
          }).catch(() => {});
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const fetchStageProgress = async () => {
      if (!teamId || !selectedProject) return;
      try {
        setLoadingProgress(true);
        const res = await api.get(`/team-submissions/progress/${teamId}/${selectedProject}`);
        setProgressByProject(prev => ({ ...prev, [selectedProject]: res.data?.data || {} }));
      } catch {
        setProgressByProject(prev => ({ ...prev, [selectedProject]: {} }));
      } finally {
        setLoadingProgress(false);
      }
    };

    fetchStageProgress();
  }, [teamId, selectedProject]);

  useEffect(() => {
    const fetchQuickLinks = async () => {
      if (!teamId || !selectedProject) return;
      try {
        setLoadingQuickLinks(true);
        const res = await api.get(`/team-submissions/wokwi/${teamId}/${selectedProject}`);
        setHistoryByProject(prev => ({ ...prev, [selectedProject]: res.data?.data || [] }));
      } catch {
        setHistoryByProject(prev => ({ ...prev, [selectedProject]: [] }));
      } finally {
        setLoadingQuickLinks(false);
      }
    };

    fetchQuickLinks();
  }, [teamId, selectedProject]);

  const handleSubmit = async () => {
    if (!selectedProject) {
      setSnack({ open: true, msg: t('wokwiSelectProject'), severity: 'warning' });
      return;
    }
    if (!wokwiLink.trim()) {
      setSnack({ open: true, msg: t('wokwiLinkRequired'), severity: 'warning' });
      return;
    }
    if (!/^https:\/\/wokwi\.com\/projects\/[a-zA-Z0-9_-]+/.test(wokwiLink.trim())) {
      setSnack({ open: true, msg: t('wokwiLinkInvalid'), severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const myTeam = await api.get('/teams/my-team');
      await api.post('/team-submissions/wokwi', {
        teamId: myTeam.data.data._id,
        projectId: selectedProject,
        stageKey: selectedStage,
        wokwiLink: wokwiLink.trim(),
        notes: notes.trim()
      });
      setSnack({ open: true, msg: t('wokwiSubmitSuccess'), severity: 'success' });
      setOpen(false);
      setWokwiLink('');
      setNotes('');
      const [progressRes, historyRes] = await Promise.all([
        api.get(`/team-submissions/progress/${myTeam.data.data._id}/${selectedProject}`),
        api.get(`/team-submissions/wokwi/${myTeam.data.data._id}/${selectedProject}`)
      ]);
      setProgressByProject(prev => ({ ...prev, [selectedProject]: progressRes.data?.data || {} }));
      setHistoryByProject(prev => ({ ...prev, [selectedProject]: historyRes.data?.data || [] }));
    } catch (err) {
      const msg = err.response?.data?.message || t('wokwiSubmitError');
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: 2 }}>
      <Paper elevation={3} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" component="h1" fontWeight={700}>
            {t('arduinoSimulatorTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('arduinoSimulatorSubtitle')}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {user?.role === 'student' && (
            <Tooltip title={t('wokwiSubmitTooltip')}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setOpen(true)}
                color="success"
              >
                {t('wokwiSubmitBtn')}
              </Button>
            </Tooltip>
          )}
        </Box>

        {user?.role === 'student' && (
          <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            {projects.length === 0 ? (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                لا يوجد مشروع جماعي مسجل لفريقك حالياً.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel id="sim-project-select-label">المشروع الحالي</InputLabel>
                  <Select
                    labelId="sim-project-select-label"
                    value={selectedProject}
                    label="المشروع الحالي"
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    {projects.map(e => (
                      <MenuItem key={e.project?._id || e._id} value={e.project?._id || e._id}>
                        {e.project?.title || e.title || e._id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  color={myProjectRole ? 'primary' : 'default'}
                  label={`دوري: ${myProjectRole ? (roleLabelMap[myProjectRole] || myProjectRole) : 'غير محدد بعد'}`}
                />
                <Chip
                  color="secondary"
                  label={`مرحلة الفريق الحالية: ${currentStageKey ? (stageLabelMap[currentStageKey] || currentStageKey) : 'غير متاحة'}`}
                />
                <Button
                  size="small"
                  variant={showQuickLinks ? 'contained' : 'outlined'}
                  onClick={() => setShowQuickLinks((prev) => !prev)}
                >
                  {showQuickLinks ? 'إخفاء الاختصارات' : 'إظهار الاختصارات'}
                </Button>
                {loadingProgress && <CircularProgress size={18} />}
              </Box>
            )}
          </Box>
        )}

        {user?.role === 'student' && selectedProject && showQuickLinks && (
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff8e1' }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              اختصارات الوصول السريع لنسخ المشروع حسب الدور
            </Typography>

            {loadingQuickLinks ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" color="text.secondary">جاري تحميل الروابط...</Typography>
              </Box>
            ) : !hasAnyQuickLink ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                لا توجد روابط محفوظة حالياً لهذه المرحلة.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestDesigner?.wokwiLink, 'المصمم')}
                    disabled={!latestDesigner?.wokwiLink}
                  >
                    نسخة المصمم
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestWiring?.wokwiLink, 'الموصل')}
                    disabled={!latestWiring?.wokwiLink}
                  >
                    نسخة الموصل
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  {(teamMembers || []).map((member) => {
                    const memberUser = member.user || member;
                    const memberId = memberUser?._id || memberUser;
                    const latestProgramming = getLatestProgrammingSubmissionByStudent(memberId);
                    return (
                      <Button
                        key={String(memberId)}
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => openWokwiLink(latestProgramming?.wokwiLink, `كود ${memberUser?.name || 'الطالب'}`)}
                        disabled={!latestProgramming?.wokwiLink}
                      >
                        كود {memberUser?.name || 'طالب'}
                      </Button>
                    );
                  })}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestTesting?.wokwiLink, 'شكل المشروع بعد دور المختبر')}
                    disabled={!latestTesting?.wokwiLink}
                  >
                    الشكل بعد دور المختبر
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
        
        <Box sx={{ width: '100%', height: simulatorHeight, minHeight: { xs: 500, md: 620 } }}>
          <iframe
            src="https://wokwi.com/projects/new/arduino-uno"
            title="Arduino Simulator"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
      </Paper>

      {/* Submit Dialog */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{t('wokwiSubmitTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t('wokwiSubmitHint')}
          </Alert>

          {/* Project selector */}
          <FormControl fullWidth required>
            <InputLabel id="wokwi-project-label">{t('wokwiSelectProject')}</InputLabel>
            <Select
              labelId="wokwi-project-label"
              value={selectedProject}
              label={t('wokwiSelectProject')}
              onChange={e => setSelectedProject(e.target.value)}
              disabled={submitting}
            >
              {projects.length > 0 ? projects.map(e => (
                <MenuItem key={e.project?._id || e._id} value={e.project?._id || e._id}>
                  {e.project?.title || e.title || e._id}
                </MenuItem>
              )) : (
                <MenuItem disabled value="">{t('wokwiNoProjects')}</MenuItem>
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel id="wokwi-stage-label">مرحلة التسليم</InputLabel>
            <Select
              labelId="wokwi-stage-label"
              value={selectedStage}
              label="مرحلة التسليم"
              onChange={e => setSelectedStage(e.target.value)}
              disabled={submitting}
            >
              {stageOptions.map(stage => (
                <MenuItem key={stage.value} value={stage.value}>
                  {stage.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Wokwi link */}
          <TextField
            fullWidth
            required
            label={t('wokwiLinkLabel')}
            placeholder="https://wokwi.com/projects/458418966794014721"
            value={wokwiLink}
            onChange={e => setWokwiLink(e.target.value)}
            disabled={submitting}
            helperText={t('wokwiLinkHelper')}
          />

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('wokwiNotesLabel')}
            placeholder={t('wokwiNotesPlaceholder')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={submitting}
            inputProps={{ maxLength: 500 }}
            helperText={`${notes.length}/500`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {submitting ? t('submitting') : t('wokwiSubmitConfirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ArduinoSimulatorPage;
