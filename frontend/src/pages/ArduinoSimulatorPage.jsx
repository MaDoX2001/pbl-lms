import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert, CircularProgress, Tooltip, Chip, InputAdornment, IconButton
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

function ArduinoSimulatorPage() {
  const { t } = useAppSettings();
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  const currentUserId = user?._id || user?.id;

  const stageOptions = [
    { value: 'design', label: 'تسليم التصميم', requiredRole: 'system_designer' },
    { value: 'wiring', label: 'تسليم التوصيل', requiredRole: 'hardware_engineer' },
    { value: 'programming', label: 'تسليم البرمجة (لكل طالب)', requiredRole: null },
    { value: 'testing', label: 'تسليم الاختبار', requiredRole: 'tester' },
    { value: 'final_delivery', label: 'التسليم النهائي', requiredRole: 'tester' },
  ];

  // Dialog state
  const [open, setOpen] = useState(false);
  const [wokwiLink, setWokwiLink] = useState('');
  const [simulatorUrl, setSimulatorUrl] = useState('https://wokwi.com/projects/new/arduino-uno');
  const [notes, setNotes] = useState('');
  const [designNarrative, setDesignNarrative] = useState('');
  const [wiringDiagramDetails, setWiringDiagramDetails] = useState('');
  const [programmingCode, setProgrammingCode] = useState('');
  const [testingReport, setTestingReport] = useState('');
  const [finalAutoFillPreview, setFinalAutoFillPreview] = useState({
    designNarrative: '',
    wiringDiagramDetails: '',
    programmingEntries: [],
    testingReport: ''
  });
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
  const [quickLinkStage, setQuickLinkStage] = useState('design');
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [lastKnownProjectLink, setLastKnownProjectLink] = useState('');
  const [pendingProjectId, setPendingProjectId] = useState('');
  const [attachments, setAttachments] = useState([]);
  const iframeRef = useRef(null);

  const isValidWokwiProjectLink = (url) => /^https:\/\/wokwi\.com\/projects\/[a-zA-Z0-9_-]+/.test(String(url || ''));

  const rememberProjectLink = (url) => {
    const normalized = String(url || '').trim();
    if (!isValidWokwiProjectLink(normalized)) return false;
    setLastKnownProjectLink(normalized);
    return true;
  };

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

  const getProjectRefId = (enrollment) => {
    if (!enrollment) return '';
    return enrollment.project?._id || enrollment.project?.id || enrollment.project || '';
  };

  const deriveProgressFromHistory = (history = [], members = []) => {
    const byStage = {
      design: history.filter((s) => s.stageKey === 'design'),
      wiring: history.filter((s) => s.stageKey === 'wiring'),
      programming: history.filter((s) => s.stageKey === 'programming'),
      testing: history.filter((s) => s.stageKey === 'testing'),
      final_delivery: history.filter((s) => s.stageKey === 'final_delivery'),
    };

    const memberIds = (members || [])
      .map((member) => member?.user?._id || member?.user || member?._id || member)
      .filter(Boolean)
      .map((id) => String(id));

    const programmingSubmitters = new Set(
      byStage.programming
        .map((s) => s.submittedBy?._id || s.submittedBy)
        .filter(Boolean)
        .map((id) => String(id))
    );

    const hasFinal = byStage.final_delivery.length > 0;
    const hasTesting = byStage.testing.length > 0;
    const hasProgramming = byStage.programming.length > 0;
    const hasWiring = byStage.wiring.length > 0;
    const hasDesign = byStage.design.length > 0;

    // Respect stage order inference to avoid false regressions when history is truncated.
    const completedDesign = hasDesign || hasWiring || hasProgramming || hasTesting || hasFinal;
    const completedWiring = hasWiring || hasProgramming || hasTesting || hasFinal;
    const completedProgramming = (memberIds.length > 0 && memberIds.every((id) => programmingSubmitters.has(id))) || hasTesting || hasFinal;
    const completedTesting = hasTesting || hasFinal;
    const completedFinalDelivery = hasFinal;

    return {
      completed: {
        design: completedDesign,
        wiring: completedWiring,
        programming: completedProgramming,
        testing: completedTesting,
        final_delivery: completedFinalDelivery,
      },
      programmingSubmittedCount: programmingSubmitters.size,
      programmingRequiredCount: memberIds.length,
    };
  };

  const selectedEnrollment = projects.find((e) => String(getProjectRefId(e)) === String(selectedProject));
  const myProjectRole = (() => {
    const memberRoles = selectedEnrollment?.memberRoles || [];
    const mine = memberRoles.find((mr) => String(mr.user?._id || mr.user) === String(currentUserId));
    return mine?.role || null;
  })();

  const allowedStageOptions = stageOptions.filter(
    (stage) => !stage.requiredRole || stage.requiredRole === myProjectRole
  );

  const derivedProgress = selectedProject
    ? deriveProgressFromHistory(historyByProject[selectedProject] || [], teamMembers)
    : null;

  const currentProgress = selectedProject
    ? ((progressByProject[selectedProject]?.completed ? progressByProject[selectedProject] : derivedProgress) || null)
    : null;

  const currentStageKey = selectedProject ? getCurrentStage(currentProgress) : null;
  const currentHistory = historyByProject[selectedProject] || [];

  const roleByUserId = (selectedEnrollment?.memberRoles || []).reduce((acc, mr) => {
    const id = String(mr.user?._id || mr.user?.id || mr.user || '');
    if (id) acc[id] = mr.role;
    return acc;
  }, {});

  const getSubmissionTimestamp = (submission) => {
    const candidate = submission?.submittedAt || submission?.createdAt || submission?.updatedAt;
    const ts = new Date(candidate || 0).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  const getLatestMatchingSubmission = (matcher) => {
    let latest = null;
    let latestTs = -1;

    for (const submission of currentHistory) {
      if (!matcher(submission)) continue;
      const ts = getSubmissionTimestamp(submission);
      if (ts >= latestTs) {
        latest = submission;
        latestTs = ts;
      }
    }

    return latest;
  };

  const getLatestStageSubmission = (stageKey, role = null) => {
    return getLatestMatchingSubmission((submission) => {
      if (submission.stageKey !== stageKey) return false;
      if (!role) return true;
      const submitterId = String(submission.submittedBy?._id || submission.submittedBy || '');
      return roleByUserId[submitterId] === role;
    }) || null;
  };

  const getLatestProgrammingSubmissionByStudent = (studentId) => {
    const target = String(studentId || '');
    if (!target) return null;
    return getLatestMatchingSubmission((submission) => {
      if (submission.stageKey !== 'programming') return false;
      const submitterId = String(submission.submittedBy?._id || submission.submittedBy || '');
      return submitterId === target;
    }) || null;
  };

  const buildFinalAutoFillPreview = () => {
    const latestDesign = getLatestStageSubmission('design', 'system_designer');
    const latestWiringSubmission = getLatestStageSubmission('wiring', 'hardware_engineer');
    const latestTestingSubmission = getLatestStageSubmission('testing', 'tester');

    const programmingEntries = (teamMembers || []).map((member) => {
      const memberId = member?.user?._id || member?.user || member?._id || null;
      const memberName = member?.user?.name || member?.name || 'طالب';
      const latestProgramming = getLatestProgrammingSubmissionByStudent(memberId);
      const extractedCode = latestProgramming?.stageInputs?.programmingCode || latestProgramming?.notes || '';

      return {
        studentId: memberId,
        studentName: memberName,
        code: extractedCode
      };
    });

    return {
      designNarrative: latestDesign?.stageInputs?.designNarrative || latestDesign?.notes || '',
      wiringDiagramDetails: latestWiringSubmission?.stageInputs?.wiringDiagramDetails || latestWiringSubmission?.notes || '',
      programmingEntries,
      testingReport: latestTestingSubmission?.stageInputs?.testingReport || latestTestingSubmission?.notes || ''
    };
  };

  const latestDesigner = getLatestStageSubmission(quickLinkStage, 'system_designer');
  const latestWiring = getLatestStageSubmission(quickLinkStage, 'hardware_engineer');
  const latestTesting = getLatestStageSubmission(quickLinkStage, 'tester');
  const hasAnyQuickLink = !!(
    latestDesigner?.wokwiLink
    || latestWiring?.wokwiLink
    || latestTesting?.wokwiLink
  );

  const simulatorHeight = showQuickLinks
    ? { xs: '62vh', md: 'calc(100vh - 300px)' }
    : { xs: '74vh', md: 'calc(100vh - 210px)' };

  const openWokwiLink = (link, label) => {
    if (!link) {
      setSnack({ open: true, msg: `لا يوجد رابط محفوظ لـ ${label}`, severity: 'warning' });
      return;
    }
    const normalized = String(link).trim();
    setSimulatorUrl(normalized);
    rememberProjectLink(normalized);
    setSnack({ open: true, msg: `تم فتح نسخة ${label} داخل المحاكي`, severity: 'info' });
  };

  const pasteWokwiLinkFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const normalized = String(clipboardText || '').trim();

      if (!normalized) {
        setSnack({ open: true, msg: 'الحافظة فارغة، انسخ رابط المشروع أولاً', severity: 'warning' });
        return false;
      }

      setWokwiLink(normalized);
      if (isValidWokwiProjectLink(normalized)) {
        rememberProjectLink(normalized);
        setSnack({ open: true, msg: 'تم لصق الرابط من الحافظة', severity: 'info' });
        return true;
      }

      setSnack({ open: true, msg: 'تم اللصق لكن الرابط ليس رابط مشروع Wokwi صالح', severity: 'warning' });
      return false;
    } catch (error) {
      setSnack({ open: true, msg: 'تعذر الوصول للحافظة. الصق الرابط يدوياً داخل الحقل', severity: 'warning' });
      return false;
    }
  };

  const openSubmitDialog = () => {
    const autoStage = currentStageKey && allowedStageOptions.some((s) => s.value === currentStageKey)
      ? currentStageKey
      : selectedStage;

    const fallbackStage = allowedStageOptions[0]?.value || 'programming';
    setSelectedStage(autoStage || fallbackStage);

    // Do not auto-overwrite with a potentially stale value; user can sync manually.
    if (isValidWokwiProjectLink(lastKnownProjectLink)) {
      setWokwiLink(lastKnownProjectLink);
    }

    setOpen(true);
  };

  useEffect(() => {
    if (!selectedProject) return;
    if (!allowedStageOptions.length) return;
    if (!allowedStageOptions.some((s) => s.value === selectedStage)) {
      setSelectedStage(allowedStageOptions[0].value);
    }
  }, [selectedProject, myProjectRole, allowedStageOptions, selectedStage]);

  useEffect(() => {
    if (currentStageKey && stageOptions.some((s) => s.value === currentStageKey)) {
      setQuickLinkStage(currentStageKey);
      setSelectedStage((prev) => (stageOptions.some((s) => s.value === prev) ? prev : currentStageKey));
    }
  }, [currentStageKey]);

  const onAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files].slice(0, 8));
    event.target.value = '';
  };

  const removeAttachmentAt = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const directWokwiLink = params.get('wokwiLink');
    const directProjectId = params.get('projectId');

    if (directWokwiLink && /^https:\/\/wokwi\.com\//.test(directWokwiLink)) {
      setSimulatorUrl(directWokwiLink);
      rememberProjectLink(directWokwiLink);
      setShowQuickLinks(false);
      setSnack({ open: true, msg: 'تم فتح الرابط داخل المحاكي', severity: 'info' });
    }

    if (directProjectId) {
      setPendingProjectId(directProjectId);
    }
  }, [location.search]);

  useEffect(() => {
    const normalized = String(simulatorUrl || '').trim();
    if (isValidWokwiProjectLink(normalized)) {
      rememberProjectLink(normalized);
    }
  }, [simulatorUrl]);

  useEffect(() => {
    const normalized = String(wokwiLink || '').trim();
    if (isValidWokwiProjectLink(normalized)) {
      rememberProjectLink(normalized);
    }
  }, [wokwiLink]);

  useEffect(() => {
    setWokwiLink('');
    setNotes('');
    setDesignNarrative('');
    setWiringDiagramDetails('');
    setProgrammingCode('');
    setTestingReport('');
    setAttachments([]);
    if (isValidWokwiProjectLink(lastKnownProjectLink)) {
      setWokwiLink(lastKnownProjectLink);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedStage !== 'final_delivery') return;
    setFinalAutoFillPreview(buildFinalAutoFillPreview());
  }, [selectedStage, currentHistory, teamMembers]);

  // Fetch team's enrolled projects for the dropdown
  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/teams/my-team').then(res => {
        const teamId = res.data.data._id;
        setTeamId(teamId);
        setTeamMembers(res.data.data?.members || []);
          api.get('/team-projects/my-team').then(r => {
            const rawEnrollments = r.data.data || [];
            const enrollments = rawEnrollments.filter((e) => !!getProjectRefId(e));
            setProjects(enrollments);
            if (enrollments.length > 0) {
              const matched = pendingProjectId
                ? enrollments.find((e) => String(getProjectRefId(e)) === String(pendingProjectId))
                : null;
              setSelectedProject(matched ? getProjectRefId(matched) : getProjectRefId(enrollments[0]));
            }
          }).catch(() => {});
      }).catch(() => {});
    }
  }, [user, pendingProjectId]);

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

    if (!allowedStageOptions.some((s) => s.value === selectedStage)) {
      setSnack({ open: true, msg: 'لا يمكنك التسليم في هذه المرحلة لأنّها ليست من صلاحيات دورك', severity: 'error' });
      return;
    }

    if (selectedStage === 'design' && !designNarrative.trim()) {
      setSnack({ open: true, msg: 'يرجى إدخال وصف المصمم قبل التسليم', severity: 'warning' });
      return;
    }

    if (selectedStage === 'wiring' && !wiringDiagramDetails.trim()) {
      setSnack({ open: true, msg: 'يرجى إدخال تفاصيل الـ Diagram قبل التسليم', severity: 'warning' });
      return;
    }

    if (selectedStage === 'programming' && !programmingCode.trim()) {
      setSnack({ open: true, msg: 'يرجى إدخال الكود البرمجي قبل التسليم', severity: 'warning' });
      return;
    }

    if (selectedStage === 'testing' && !testingReport.trim()) {
      setSnack({ open: true, msg: 'يرجى إدخال تقرير المختبر قبل التسليم', severity: 'warning' });
      return;
    }

    if (selectedStage === 'final_delivery') {
      const hasDesignNarrative = Boolean((finalAutoFillPreview.designNarrative || '').trim());
      const hasWiringDiagram = Boolean((finalAutoFillPreview.wiringDiagramDetails || '').trim());
      const hasTestingReport = Boolean((finalAutoFillPreview.testingReport || '').trim());
      const entries = Array.isArray(finalAutoFillPreview.programmingEntries)
        ? finalAutoFillPreview.programmingEntries
        : [];
      const hasAllCodes = entries.length > 0 && entries.every((entry) => Boolean((entry.code || '').trim()));

      if (!hasDesignNarrative || !hasWiringDiagram || !hasTestingReport || !hasAllCodes) {
        setSnack({
          open: true,
          msg: 'لا يمكن قبول التسليم النهائي قبل اكتمال مدخلات التصميم والـ Diagram وأكواد كل الطلاب وتقرير الاختبار.',
          severity: 'warning'
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const myTeam = await api.get('/teams/my-team');
      const formData = new FormData();
      formData.append('teamId', myTeam.data.data._id);
      formData.append('projectId', selectedProject);
      formData.append('stageKey', selectedStage);
      formData.append('wokwiLink', wokwiLink.trim());
      formData.append('notes', notes.trim());

      if (selectedStage === 'design') {
        formData.append('designNarrative', designNarrative.trim());
      }
      if (selectedStage === 'wiring') {
        formData.append('wiringDiagramDetails', wiringDiagramDetails.trim());
      }
      if (selectedStage === 'programming') {
        formData.append('programmingCode', programmingCode.trim());
      }
      if (selectedStage === 'testing') {
        formData.append('testingReport', testingReport.trim());
      }
      if (selectedStage === 'final_delivery') {
        formData.append('designNarrative', finalAutoFillPreview.designNarrative || '');
        formData.append('wiringDiagramDetails', finalAutoFillPreview.wiringDiagramDetails || '');
        formData.append(
          'programmingCode',
          (finalAutoFillPreview.programmingEntries || [])
            .map((entry) => `/* ${entry.studentName || 'طالب'} */\n${entry.code || ''}`)
            .join('\n\n')
            .trim()
        );
        formData.append('testingReport', finalAutoFillPreview.testingReport || '');
      }

      attachments.forEach((file) => formData.append('attachments', file));

      await api.post('/team-submissions/wokwi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSnack({ open: true, msg: t('wokwiSubmitSuccess'), severity: 'success' });
      setOpen(false);
      setWokwiLink('');
      setNotes('');
      setDesignNarrative('');
      setWiringDiagramDetails('');
      setProgrammingCode('');
      setTestingReport('');
      setAttachments([]);
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
                onClick={openSubmitDialog}
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
                      <MenuItem key={getProjectRefId(e)} value={getProjectRefId(e)}>
                        {e.project?.title || e.title || e._id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  color={myProjectRole ? 'primary' : 'default'}
                  label={myProjectRole
                    ? `دوري (مثبت): ${roleLabelMap[myProjectRole] || myProjectRole}`
                    : 'دوري: غير محدد بعد'}
                />
                <Chip
                  color="secondary"
                  label={`مرحلة الفريق الحالية: ${currentStageKey ? (stageLabelMap[currentStageKey] || currentStageKey) : 'غير متاحة'}`}
                />
                {currentProgress && (
                  <Chip
                    color="info"
                    label={`البرمجة: ${currentProgress.programmingSubmittedCount || 0}/${currentProgress.programmingRequiredCount || 0}`}
                  />
                )}
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
              اختصارات الوصول السريع: اختر مرحلة، ثم افتح آخر نسخة لكل دور في هذه المرحلة
            </Typography>

            <FormControl size="small" sx={{ minWidth: 240, mb: 1 }}>
              <InputLabel id="quick-link-stage-label">مرحلة الاختصارات</InputLabel>
              <Select
                labelId="quick-link-stage-label"
                value={quickLinkStage}
                label="مرحلة الاختصارات"
                onChange={(e) => setQuickLinkStage(e.target.value)}
              >
                {stageOptions.map((stage) => (
                  <MenuItem key={stage.value} value={stage.value}>{stage.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {loadingQuickLinks ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" color="text.secondary">جاري تحميل الروابط...</Typography>
              </Box>
            ) : !hasAnyQuickLink ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                لا توجد نسخة محفوظة للأدوار في هذه المرحلة.
              </Alert>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestDesigner?.wokwiLink, `المصمم - ${stageLabelMap[quickLinkStage] || quickLinkStage}`)}
                    disabled={!latestDesigner?.wokwiLink}
                  >
                    نسخة المصمم
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestWiring?.wokwiLink, `الموصل - ${stageLabelMap[quickLinkStage] || quickLinkStage}`)}
                    disabled={!latestWiring?.wokwiLink}
                  >
                    نسخة الموصل
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openWokwiLink(latestTesting?.wokwiLink, `المختبر - ${stageLabelMap[quickLinkStage] || quickLinkStage}`)}
                    disabled={!latestTesting?.wokwiLink}
                  >
                    نسخة المختبر
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
        
        <Box sx={{ width: '100%', height: simulatorHeight, minHeight: { xs: 500, md: 620 } }}>
          <iframe
            ref={iframeRef}
            src={simulatorUrl}
            title="Arduino Simulator"
            onLoad={() => {
              const currentSrc = iframeRef.current?.src || '';
              if (
                /^https:\/\/wokwi\.com\//.test(currentSrc)
                && currentSrc !== simulatorUrl
              ) {
                setSimulatorUrl(currentSrc);
              }
              rememberProjectLink(currentSrc);
            }}
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
                <MenuItem key={getProjectRefId(e)} value={getProjectRefId(e)}>
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
              {allowedStageOptions.map(stage => (
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="لصق الرابط من المحاكي">
                    <IconButton
                      onClick={pasteWokwiLinkFromClipboard}
                      disabled={submitting}
                      edge="end"
                      size="small"
                    >
                      <ContentPasteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
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

          {selectedStage === 'design' && (
            <TextField
              fullWidth
              required
              multiline
              minRows={4}
              label="مدخل المصمم"
              placeholder="اكتب وصف النظام، الفكرة، المدخلات والمخرجات، ومنطق التصميم"
              value={designNarrative}
              onChange={(e) => setDesignNarrative(e.target.value)}
              disabled={submitting}
            />
          )}

          {selectedStage === 'wiring' && (
            <TextField
              fullWidth
              required
              multiline
              minRows={5}
              label="محتوى الـ Diagram"
              placeholder="اكتب كل ما بداخل الـ Diagram من المحاكي: التوصيلات، أسماء العناصر، الأرجل، الملاحظات"
              value={wiringDiagramDetails}
              onChange={(e) => setWiringDiagramDetails(e.target.value)}
              disabled={submitting}
            />
          )}

          {selectedStage === 'programming' && (
            <TextField
              fullWidth
              required
              multiline
              minRows={8}
              label="الكود البرمجي"
              placeholder="الصق الكود البرمجي الخاص بك هنا"
              value={programmingCode}
              onChange={(e) => setProgrammingCode(e.target.value)}
              disabled={submitting}
            />
          )}

          {selectedStage === 'testing' && (
            <TextField
              fullWidth
              required
              multiline
              minRows={6}
              label="تقرير المختبر"
              placeholder="اكتب تقرير اختبار الأكواد الثلاثة: حالة كل كود، النتائج، الأخطاء، والملاحظات"
              value={testingReport}
              onChange={(e) => setTestingReport(e.target.value)}
              disabled={submitting}
            />
          )}

          {selectedStage === 'final_delivery' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="info">
                خانات النهائي يتم تعبئتها تلقائياً من آخر نسخة مرفوعة في كل مرحلة، وهي للعرض فقط.
              </Alert>

              <TextField
                fullWidth
                multiline
                minRows={3}
                label="مدخل المصمم (تلقائي)"
                value={finalAutoFillPreview.designNarrative || 'لا يوجد مدخل محفوظ'}
                InputProps={{ readOnly: true }}
              />

              <TextField
                fullWidth
                multiline
                minRows={4}
                label="مدخل الموصل - تفاصيل Diagram (تلقائي)"
                value={finalAutoFillPreview.wiringDiagramDetails || 'لا يوجد مدخل محفوظ'}
                InputProps={{ readOnly: true }}
              />

              {(finalAutoFillPreview.programmingEntries || []).map((entry, index) => (
                <TextField
                  key={`${entry.studentId || index}`}
                  fullWidth
                  multiline
                  minRows={5}
                  label={`كود برمجة الطالب: ${entry.studentName || `طالب ${index + 1}`} (تلقائي)`}
                  value={entry.code || 'لا يوجد كود محفوظ'}
                  InputProps={{ readOnly: true }}
                />
              ))}

              <TextField
                fullWidth
                multiline
                minRows={4}
                label="تقرير المختبر (تلقائي)"
                value={finalAutoFillPreview.testingReport || 'لا يوجد تقرير محفوظ'}
                InputProps={{ readOnly: true }}
              />
            </Box>
          )}

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              disabled={submitting}
              sx={{ mb: 1 }}
            >
              إضافة ملفات (حتى 8 ملفات)
              <input
                hidden
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                onChange={onAttachmentChange}
              />
            </Button>

            {attachments.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {attachments.map((file, index) => (
                  <Chip
                    key={`${file.name}-${index}`}
                    label={file.name}
                    onDelete={submitting ? undefined : () => removeAttachmentAt(index)}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Box>
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
