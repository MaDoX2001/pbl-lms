import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Feedback as FeedbackIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import StudentEvaluationStatus from '../components/StudentEvaluationStatus';
import FinalEvaluationSummary from '../components/FinalEvaluationSummary';
import EvaluationProgressBar from '../components/EvaluationProgressBar';
import BadgeCelebrationPopup from '../components/BadgeCelebrationPopup';
import MilestoneTimeline from '../components/MilestoneTimeline';
import { useAppSettings } from '../context/AppSettingsContext';

const STAGE_META = {
  design: { label: 'تسليم التصميم', requiredRole: 'system_designer' },
  wiring: { label: 'تسليم الموصل', requiredRole: 'hardware_engineer' },
  programming: { label: 'تسليم الكود', requiredRole: null },
  testing: { label: 'تسليم المختبر', requiredRole: 'tester' },
  final_delivery: { label: 'التسليم النهائي', requiredRole: 'tester' }
};

const FILE_UPLOAD_STAGES = ['design', 'programming', 'testing', 'final_delivery'];

const ROLE_LABEL = {
  system_designer: 'Designer Lead',
  hardware_engineer: 'Builder Lead',
  tester: 'Tester Lead'
};

/**
 * TeamProjectPage Component
 * 
 * Shows project details and all submissions for the team.
 * Students can upload new submissions.
 * Teachers can view all team submissions.
 */
const TeamProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { t } = useAppSettings();

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamEnrollment, setTeamEnrollment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    description: '',
    stageKey: 'design'
  });
  const [uploading, setUploading] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState(null);
  const [badgePopup, setBadgePopup] = useState({ open: false, badge: null });
  const [completedMilestoneIds, setCompletedMilestoneIds] = useState(new Set());
  const [milestoneProgressMap, setMilestoneProgressMap] = useState({});
  const [stageProgress, setStageProgress] = useState(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let resolvedTeamId = null;

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      const projectData = projectResponse.data.data;
      setProject(projectData);

      // Get my team (only if team project)
      if (projectData.isTeamProject) {
        try {
          const teamResponse = await api.get('/teams/my-team');
          const teamData = teamResponse.data.data;
          resolvedTeamId = teamData?._id || null;
          setTeam(teamData);

          // Get team submissions
          const submissionsResponse = await api.get(
            `/team-submissions/team/${teamData._id}/project/${projectId}`
          );
          setSubmissions(submissionsResponse.data.data);

          // Get enrollment (for role in current project)
          const enrollmentsResponse = await api.get(`/team-projects/team/${teamData._id}`);
          const enrollment = (enrollmentsResponse.data.data || []).find(
            (e) => String(e.project?._id) === String(projectId)
          );
          setTeamEnrollment(enrollment || null);

          // Get backend stage progress (sequence + programming coverage)
          const stageRes = await api.get(`/team-submissions/progress/${teamData._id}/${projectId}`);
          setStageProgress(stageRes.data?.data || null);
        } catch (teamErr) {
          console.error('Team fetch error:', teamErr);
          toast.warning(t('teamNotFoundForProject'));
        }
      } else {
        // Individual project - get individual submissions
        try {
          const submissionsResponse = await api.get(
            `/submissions/project/${projectId}/student/${user._id}`
          );
          setSubmissions(submissionsResponse.data.data);
        } catch (subErr) {
          console.error('Submissions fetch error:', subErr);
        }
      }

      // Load student milestone progress (for timeline states and completion dates)
      if (user?.role === 'student') {
        try {
          const progressRes = await api.get(`/progress/${projectId}`);
          const items = progressRes.data?.data?.milestoneProgress || [];
          const completed = new Set(
            items.filter(item => item.completed).map(item => String(item.milestoneId))
          );
          const progressMeta = {};
          items.forEach(item => {
            progressMeta[String(item.milestoneId)] = {
              completed: !!item.completed,
              completedAt: item.completedAt || null,
            };
          });
          setCompletedMilestoneIds(completed);
          setMilestoneProgressMap(progressMeta);
        } catch (_) {
          setCompletedMilestoneIds(new Set());
          setMilestoneProgressMap({});
        }
      }

      // Fetch evaluation status for progress bar
      if (user.role === 'student') {
        await fetchEvaluationStatus(projectData, resolvedTeamId);
      }

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericLoadError'));
      setLoading(false);
    }
  };

  const fetchEvaluationStatus = async (projectData, teamIdOverride = null) => {
    try {
      let phase1Complete = false;
      let phase2Complete = false;
      let finalEval = null;

      // Phase 1 status
      const teamId = teamIdOverride || team?._id;
      if (projectData?.isTeamProject && teamId) {
        try {
          const phase1Res = await api.get(`/assessment/group-status/${projectId}/${teamId}`);
          phase1Complete = phase1Res.data.data?.phase1Complete || false;
        } catch (err) {
          phase1Complete = false;
        }
      } else {
        phase1Complete = true; // Individual project, skip phase 1
      }

      // Phase 2 status
      try {
        const phase2Res = await api.get(`/assessment/individual-status/${projectId}/${user._id}`);
        phase2Complete = phase2Res.data.data?.phase2Complete || false;
      } catch (err) {
        phase2Complete = false;
      }

      // Final evaluation
      try {
        const finalRes = await api.get(`/assessment/final/${projectId}/${user._id}`);
        finalEval = finalRes.data.data;
      } catch (err) {
        finalEval = null;
      }

      setEvaluationStatus({
        phase1Complete,
        phase2Complete,
        finalComplete: !!finalEval,
        finalStatus: finalEval?.status,
        retry: finalEval?.retryAllowed
      });
    } catch (err) {
      console.error('Error fetching evaluation status:', err);
    }
  };

  const handleFileChange = (e) => {
    setUploadForm({ ...uploadForm, file: e.target.files[0] });
  };

  const myProjectRole = useMemo(() => {
    const roles = teamEnrollment?.memberRoles || [];
    const mine = roles.find((r) => String(r.user?._id || r.user) === String(user?._id));
    return mine?.role || null;
  }, [teamEnrollment, user?._id]);

  const getStageLockReason = (stageKey) => {
    if (!stageKey) return 'اختر مرحلة التسليم أولاً';

    if (project?.deadline && new Date() > new Date(project.deadline)) {
      return 'انتهى موعد تسليم المشروع';
    }

    const stage = STAGE_META[stageKey];
    if (!stage) return 'مرحلة غير صالحة';

    if (!stageProgress?.completed) {
      return 'جاري تحميل حالة المراحل...';
    }

    const requiredRole = stage.requiredRole;
    if (requiredRole && myProjectRole !== requiredRole) {
      return `هذه المرحلة مخصصة لدور ${ROLE_LABEL[requiredRole] || requiredRole}`;
    }

    const completed = stageProgress.completed;
    if (stageKey === 'wiring' && !completed.design) return 'يجب إكمال مرحلة التصميم أولاً';
    if (stageKey === 'programming' && !completed.wiring) return 'يجب إكمال مرحلة الموصل أولاً';
    if (stageKey === 'testing' && !completed.programming) return 'يجب أن يسلّم كل أعضاء الفريق في مرحلة البرمجة أولاً';
    if (stageKey === 'final_delivery' && !completed.testing) return 'يجب إكمال مرحلة المختبر أولاً';

    return '';
  };

  const handleUploadSubmit = async () => {
    const lockReason = getStageLockReason(uploadForm.stageKey);
    if (lockReason) {
      toast.error(lockReason);
      return;
    }

    if (!uploadForm.file) {
      toast.error(t('fileRequired'));
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('teamId', team._id);
      formData.append('projectId', projectId);
      formData.append('description', uploadForm.description);
      formData.append('stageKey', uploadForm.stageKey);

      await api.post('/team-submissions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(t('submissionUploadSuccess'));
      setOpenUploadDialog(false);
      setUploadForm({ file: null, description: '', stageKey: 'design' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || t('uploadFileError'));
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return 'success';
      case 'reviewed':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'graded':
        return t('graded');
      case 'reviewed':
        return t('reviewed');
      default:
        return t('pending');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Skeleton variant="rectangular" height={40} width={150} sx={{ mb: 2 }} />
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Skeleton variant="text" height={50} width="60%" sx={{ mb: 2 }} />
          <Skeleton variant="text" height={20} width="100%" />
          <Skeleton variant="text" height={20} width="90%" />
          <Skeleton variant="text" height={20} width="95%" sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" height={32} width={100} />
            <Skeleton variant="rounded" height={32} width={120} />
          </Box>
        </Paper>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (!project || !team) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('projectDataLoadFailed')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/team/dashboard')}
        sx={{ mb: 2 }}
      >
        {t('backToTeamDashboard')}
      </Button>

      {/* Project Details */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {project.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {project.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={t('levelWithValue', { level: project.projectLevel || project.difficulty || t('notSpecified') })} />
          {project.isTeamProject && team && (
            <Chip label={t('teamWithValue', { team: team.name })} color="primary" />
          )}
          {!project.isTeamProject && (
            <Chip label={t('individualProject')} color="secondary" />
          )}
          {project.projectOrder && (
            <Chip label={t('orderWithValue', { order: project.projectOrder })} variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Milestone Timeline */}
      {project.milestones?.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            مراحل المشروع
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <MilestoneTimeline
            milestones={project.milestones}
            deadline={project.deadline}
            completedIds={completedMilestoneIds}
            milestoneProgress={milestoneProgressMap}
          />
        </Paper>
      )}

      {/* Student Evaluation Status - Only show for students */}
      {user.role === 'student' && evaluationStatus && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {t('evaluationStatusTitle')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <EvaluationProgressBar 
              status={evaluationStatus}
              isTeamProject={project?.isTeamProject || false}
            />
          </Box>

          {/* Detailed Status */}
          <StudentEvaluationStatus 
            projectId={projectId}
            studentId={user._id}
            teamId={team?._id}
            isTeamProject={project?.isTeamProject || false}
          />
        </Paper>
      )}

      {/* Upload Section */}
      {user.role === 'student' && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            دورك في هذا المشروع: <strong>{myProjectRole ? (ROLE_LABEL[myProjectRole] || myProjectRole) : 'غير محدد بعد'}</strong>
            {!myProjectRole && ' — اختر دورك من لوحة الفريق أولاً'}
          </Alert>

          {stageProgress && (
            <Alert severity="info" sx={{ mb: 2 }}>
              تقدم البرمجة: {stageProgress.programmingSubmittedCount}/{stageProgress.programmingRequiredCount} طالب سلّم.
            </Alert>
          )}

          {project.deadline && new Date() > new Date(project.deadline) ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('projectDeadlinePassed')}
            </Alert>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                كل مراحل المشروع الجماعي يتم تسليمها عبر Wokwi (تصميم، توصيل، برمجة، اختبار، وتسليم نهائي).
              </Alert>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => navigate(`/arduino-simulator?projectId=${projectId}`)}
                fullWidth
              >
                فتح صفحة المحاكي والتسليم
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Submissions List */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {t('submissionsCount', { count: submissions.length })}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {submissions.length === 0 ? (
          <Alert severity="info">{t('noSubmissionsYet')}</Alert>
        ) : (
          <List>
            {submissions.map((submission, index) => (
              <Card key={submission._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        {t('submissionNumber', { number: submissions.length - index })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('uploadedBy', { name: submission.submittedBy.name })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dateWithValue', { date: new Date(submission.submittedAt).toLocaleString('ar-EG') })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        المرحلة: {STAGE_META[submission.stageKey]?.label || submission.stageKey || 'غير محدد'}
                      </Typography>
                      {submission.submissionType === 'wokwi' && (
                        <Typography variant="body2" color="text.secondary">
                          نوع التسليم: رابط Wokwi
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={getStatusLabel(submission.status)}
                      color={getStatusColor(submission.status)}
                    />
                  </Box>

                  {/* Submission Info */}
                  {submission.submissionType === 'wokwi' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <DescriptionIcon color="action" />
                      <Typography variant="body2">رابط محاكاة Wokwi</Typography>
                      {submission.wokwiLink && (
                        <IconButton
                          size="small"
                          href={submission.wokwiLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <DescriptionIcon color="action" />
                      <Typography variant="body2">{submission.fileName || 'ملف مرفوع'}</Typography>
                      {submission.fileUrl && (
                        <IconButton
                          size="small"
                          href={submission.fileUrl}
                          target="_blank"
                          download
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                    </Box>
                  )}

                  {/* Description */}
                  {submission.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {t('descriptionLabel')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {submission.description}
                      </Typography>
                    </Box>
                  )}

                  {/* Feedback */}
                  {submission.feedback && (
                    <Alert severity="info" icon={<FeedbackIcon />} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {t('teacherFeedbackLabel')}
                      </Typography>
                      <Typography variant="body2">
                        {submission.feedback}
                      </Typography>
                      {submission.feedbackBy && (
                        <Typography variant="caption" color="text.secondary">
                          - {submission.feedbackBy.name}
                        </Typography>
                      )}
                    </Alert>
                  )}

                  {/* Grade */}
                  {submission.score !== null && (
                    <Alert severity="success" icon={<GradeIcon />}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {t('scoreOutOf100', { score: submission.score })}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Paper>

      {/* Legacy file-upload dialog kept hidden to preserve compatibility; workflow is now Wokwi-only */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('uploadNewSubmission')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="stage-key-label">مرحلة التسليم</InputLabel>
              <Select
                labelId="stage-key-label"
                label="مرحلة التسليم"
                value={uploadForm.stageKey}
                onChange={(e) => setUploadForm({ ...uploadForm, stageKey: e.target.value })}
              >
                {Object.entries(STAGE_META)
                  .filter(([key]) => FILE_UPLOAD_STAGES.includes(key))
                  .map(([key, meta]) => (
                  <MenuItem key={key} value={key} disabled={!!getStageLockReason(key)}>
                    {meta.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              التسليم يتم من صفحة المحاكي والتسليم الموحدة.
            </Alert>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setOpenUploadDialog(false);
                navigate(`/arduino-simulator?projectId=${projectId}`);
              }}
            >
              فتح صفحة المحاكي والتسليم
            </Button>

            {!!getStageLockReason(uploadForm.stageKey) && (
              <Alert severity="warning">{getStageLockReason(uploadForm.stageKey)}</Alert>
            )}

            <Button
              variant="outlined"
              component="label"
              fullWidth
            >
              {uploadForm.file ? uploadForm.file.name : t('chooseFile')}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
              />
            </Button>

            <TextField
              label={t('descriptionOptional')}
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Alert severity="info">
              {t('uploadAnyFileMaxSize')}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>{t('cancel')}</Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={!uploadForm.file || uploading || !!getStageLockReason(uploadForm.stageKey)}
          >
            {uploading ? <CircularProgress size={24} /> : t('upload')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Badge Celebration Popup */}
      <BadgeCelebrationPopup
        open={badgePopup.open}
        onClose={() => setBadgePopup({ open: false, badge: null })}
        badge={badgePopup.badge}
      />
    </Container>
  );
};

export default TeamProjectPage;
