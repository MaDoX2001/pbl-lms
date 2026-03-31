import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Feedback as FeedbackIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * ProjectSubmissionsManagement Component
 * 
 * Teacher/Admin view of all team submissions for a project.
 * Can add feedback and grades.
 * Access: Teacher/Admin only
 */
const ProjectSubmissionsManagement = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppSettings();

  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [stageBoard, setStageBoard] = useState([]);
  const [stageLoading, setStageLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    submission: null,
    feedback: ''
  });
  const [gradeDialog, setGradeDialog] = useState({
    open: false,
    submission: null,
    score: ''
  });
  const [teamRetryDialog, setTeamRetryDialog] = useState({
    open: false,
    team: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      setProject(projectResponse.data.data);

      // Get all submissions for this project
      const submissionsResponse = await api.get(`/team-submissions/project/${projectId}`);
      setSubmissions(submissionsResponse.data.data);

      // Stage progress board by team
      setStageLoading(true);
      const teamsResponse = await api.get(`/team-projects/project/${projectId}`);
      const enrollments = teamsResponse.data.data || [];

      const progressRows = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            const progressRes = await api.get(`/team-submissions/progress/${enrollment.team._id}/${projectId}`);
            return {
              team: enrollment.team,
              progress: progressRes.data.data
            };
          } catch (_) {
            return {
              team: enrollment.team,
              progress: null
            };
          }
        })
      );
      setStageBoard(progressRows);
      setStageLoading(false);

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericLoadError'));
      setStageLoading(false);
      setLoading(false);
    }
  };

  const handleOpenFeedbackDialog = (submission) => {
    setFeedbackDialog({
      open: true,
      submission,
      feedback: submission.feedback || ''
    });
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.put(`/team-submissions/${feedbackDialog.submission._id}/feedback`, {
        feedback: feedbackDialog.feedback
      });
      toast.success(t('feedbackAddedSuccess'));
      setFeedbackDialog({ open: false, submission: null, feedback: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  const handleOpenGradeDialog = (submission) => {
    setGradeDialog({
      open: true,
      submission,
      score: submission.score !== null ? submission.score : ''
    });
  };

  const handleSubmitGrade = async () => {
    try {
      const score = parseFloat(gradeDialog.score);
      if (isNaN(score) || score < 0 || score > 100) {
        toast.error(t('scoreRange0To100'));
        return;
      }

      await api.put(`/team-submissions/${gradeDialog.submission._id}/grade`, {
        score
      });
      toast.success(t('scoreAddedSuccess'));
      setGradeDialog({ open: false, submission: null, score: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  const handleOpenDigitalEvaluation = (submission) => {
    const teamId = submission?.team?._id;
    const studentId = submission?.submittedBy?._id || submission?.submittedBy;
    const stageKey = submission?.stageKey;

    // Programming & final delivery are evaluated per student.
    if ((stageKey === 'programming' || stageKey === 'final_delivery') && studentId) {
      navigate(`/evaluate/individual/${projectId}/${studentId}/${submission._id}`);
      return;
    }

    // Other stages use group evaluation flow.
    if (teamId) {
      navigate(`/evaluate/group/${projectId}/${teamId}/${submission._id}`);
      return;
    }

    toast.error('تعذر فتح صفحة التقييم: بيانات الفريق/الطالب غير مكتملة');
  };

  const handleOpenTeamRetryDialog = (team) => {
    setTeamRetryDialog({
      open: true,
      team
    });
  };

  const handleConfirmTeamRetry = async () => {
    try {
      const teamId = teamRetryDialog.team?._id;
      if (!teamId) {
        toast.error('معرف الفريق غير متوفر');
        return;
      }

      await api.post('/assessment/allow-retry', {
        projectId,
        teamId
      });

      toast.success('تم فتح إعادة المحاولة للفريق في جميع المراحل بنجاح');
      setTeamRetryDialog({ open: false, team: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل فتح إعادة المحاولة للفريق');
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

  const getStageLabel = (stageKey) => {
    switch (stageKey) {
      case 'design':
        return 'التصميم';
      case 'wiring':
        return 'الموصل';
      case 'programming':
        return 'البرمجة';
      case 'testing':
        return 'المختبر';
      case 'final_delivery':
        return 'النهائي';
      default:
        return stageKey || 'غير محدد';
    }
  };

  const getTeamMemberNames = (team) => {
    return (team?.members || [])
      .map((member) => member?.user?.name || member?.name)
      .filter(Boolean);
  };

  const summary = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === 'pending').length;
    const reviewed = submissions.filter((s) => s.status === 'reviewed').length;
    const graded = submissions.filter((s) => s.status === 'graded').length;
    const teams = new Set(submissions.map((s) => s?.team?._id).filter(Boolean)).size;

    return { total, pending, reviewed, graded, teams };
  }, [submissions]);

  const filteredAndSortedSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = submissions.filter((submission) => {
      if (stageFilter !== 'all' && submission.stageKey !== stageFilter) {
        return false;
      }

      if (statusFilter !== 'all' && submission.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const teamName = submission?.team?.name || '';
      const studentName = submission?.submittedBy?.name || '';
      const fileName = submission?.fileName || '';
      const description = submission?.description || '';
      const notes = submission?.notes || '';

      const haystack = `${teamName} ${studentName} ${fileName} ${description} ${notes}`.toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      }

      if (sortBy === 'score_desc') {
        return (Number(b.score) || -1) - (Number(a.score) || -1);
      }

      if (sortBy === 'score_asc') {
        return (Number(a.score) || 101) - (Number(b.score) || 101);
      }

      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    return sorted;
  }, [submissions, searchQuery, stageFilter, statusFilter, sortBy]);

  const submissionsByTeam = useMemo(() => {
    return filteredAndSortedSubmissions.reduce((acc, submission) => {
      const teamId = submission?.team?._id;
      if (!teamId) return acc;

      if (!acc[teamId]) {
        acc[teamId] = {
          team: submission.team,
          submissions: []
        };
      }

      acc[teamId].submissions.push(submission);
      return acc;
    }, {});
  }, [filteredAndSortedSubmissions]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!project) {
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
        onClick={() => navigate('/projects')}
        sx={{ mb: 2 }}
      >
        {t('backToProjects')}
      </Button>

      {/* Project Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {project.title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`إجمالي التسليمات: ${summary.total}`} color="primary" size="small" />
          <Chip label={`فرق: ${summary.teams}`} size="small" variant="outlined" />
          <Chip label={`قيد الانتظار: ${summary.pending}`} color="warning" size="small" variant="outlined" />
          <Chip label={`مراجع: ${summary.reviewed}`} color="info" size="small" variant="outlined" />
          <Chip label={`مقَيَّم: ${summary.graded}`} color="success" size="small" variant="outlined" />
        </Box>
      </Paper>

      {/* Compact Filters */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 2,
          position: 'sticky',
          top: 8,
          zIndex: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: '1fr', md: '1.8fr 1fr 1fr 1fr auto' }
          }}
        >
          <TextField
            size="small"
            label="بحث (فريق/طالب/محتوى)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <TextField
            size="small"
            select
            label="المرحلة"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <MenuItem value="all">كل المراحل</MenuItem>
            <MenuItem value="design">التصميم</MenuItem>
            <MenuItem value="wiring">الموصل</MenuItem>
            <MenuItem value="programming">البرمجة</MenuItem>
            <MenuItem value="testing">المختبر</MenuItem>
            <MenuItem value="final_delivery">النهائي</MenuItem>
          </TextField>

          <TextField
            size="small"
            select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">كل الحالات</MenuItem>
            <MenuItem value="pending">قيد الانتظار</MenuItem>
            <MenuItem value="reviewed">مراجع</MenuItem>
            <MenuItem value="graded">مقَيَّم</MenuItem>
          </TextField>

          <TextField
            size="small"
            select
            label="الترتيب"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="latest">الأحدث أولاً</MenuItem>
            <MenuItem value="oldest">الأقدم أولاً</MenuItem>
            <MenuItem value="score_desc">الدرجة: الأعلى</MenuItem>
            <MenuItem value="score_asc">الدرجة: الأقل</MenuItem>
          </TextField>

          <Button
            variant="text"
            onClick={() => {
              setSearchQuery('');
              setStageFilter('all');
              setStatusFilter('all');
              setSortBy('latest');
            }}
          >
            مسح الفلاتر
          </Button>
        </Box>
      </Paper>

      {/* Stage Tracking Board */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          لوحة متابعة المراحل
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {stageLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : stageBoard.length === 0 ? (
          <Alert severity="info">لا توجد فرق مسجلة في هذا المشروع بعد.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {stageBoard.map((row) => {
              const completed = row.progress?.completed || {};
              const stageChips = [
                { key: 'design', label: 'التصميم' },
                { key: 'wiring', label: 'الموصل' },
                { key: 'programming', label: 'البرمجة' },
                { key: 'testing', label: 'المختبر' },
                { key: 'final_delivery', label: 'النهائي' }
              ];

              return (
                <Card key={row.team._id} variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>{row.team.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      الأعضاء: {getTeamMemberNames(row.team).join('، ') || 'غير متاح'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {stageChips.map((s) => (
                        <Chip
                          key={s.key}
                          label={`${s.label}: ${completed[s.key] ? 'مكتمل' : 'غير مكتمل'}`}
                          color={completed[s.key] ? 'success' : 'default'}
                          variant={completed[s.key] ? 'filled' : 'outlined'}
                          size="small"
                        />
                      ))}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      برمجة: {row.progress?.programmingSubmittedCount || 0}/{row.progress?.programmingRequiredCount || 0}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Submissions by Team */}
      {submissions.length === 0 ? (
        <Alert severity="info">{t('noSubmissionsUploadedYet')}</Alert>
      ) : Object.keys(submissionsByTeam).length === 0 ? (
        <Alert severity="info">لا توجد نتائج مطابقة للفلاتر الحالية.</Alert>
      ) : (
        Object.values(submissionsByTeam).map(({ team, submissions: teamSubmissions }) => (
          <Accordion key={team._id} sx={{ mb: 1.5 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{team.name}</Typography>
                <Chip label={t('teamSubmissionsCount', { count: teamSubmissions.length })} size="small" />
                <Box sx={{ flex: 1 }} />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTeamRetryDialog(team);
                  }}
                  sx={{ mr: 1 }}
                >
                  فتح إعادة المحاولة للفريق كله
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {t('membersWithValue', { members: getTeamMemberNames(team).join(', ') || 'غير متاح' })}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {teamSubmissions
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                .map((submission, index) => {
                  // First submission in sorted list is the most recent (last submission)
                  const isLastSubmission = index === 0;
                  
                  return (
                    <Card
                      key={submission._id} 
                      sx={{ 
                        mb: 1,
                        border: isLastSubmission ? '2px solid #1976d2' : 'none',
                        bgcolor: isLastSubmission ? '#e3f2fd' : 'transparent'
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1.2, gap: 1, flexWrap: 'wrap' }}>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.6, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {t('submissionNumber', { number: teamSubmissions.length - index })}
                              </Typography>
                              <Chip
                                label={`المرحلة: ${getStageLabel(submission.stageKey)}`}
                                size="small"
                                variant="outlined"
                              />
                              {isLastSubmission && (
                                <Chip 
                                  label={t('latestSubmissionApproved')} 
                                  color="primary" 
                                  size="small"
                                  sx={{ fontWeight: 'bold' }}
                                />
                              )}
                              {submission.stageKey === 'final_delivery' && (
                                <Chip
                                  label="تسليم نهائي"
                                  color="success"
                                  size="small"
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {t('uploadedByLabel')}{' '}
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  color: 'primary.main',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                                onClick={() => navigate(`/user/${submission.submittedBy._id}`)}
                              >
                                {submission.submittedBy.name}
                              </Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('dateWithValue', { date: new Date(submission.submittedAt).toLocaleString('ar-EG') })}
                            </Typography>
                          </Box>
                          <Chip
                            label={getStatusLabel(submission.status)}
                            color={getStatusColor(submission.status)}
                            size="small"
                          />
                        </Box>

                      {/* Submission Link / File */}
                      {submission.submissionType === 'wokwi' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2, flexWrap: 'wrap' }}>
                          <DescriptionIcon color="action" />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            رابط المحاكي (Wokwi)
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInNewIcon />}
                            href={submission.wokwiLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1, px: 1 }}
                          >
                            فتح المحاكي للتقييم
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                          <DescriptionIcon color="action" />
                          <Typography variant="caption">{submission.fileName}</Typography>
                          <IconButton
                            size="small"
                            href={submission.fileUrl}
                            target="_blank"
                            download
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Box>
                      )}

                      {/* Description */}
                      {submission.description && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {t('descriptionLabel')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {submission.description}
                          </Typography>
                        </Box>
                      )}

                      {submission.notes && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            ملاحظات الطالب
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {submission.notes}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 1 }} />

                      {/* Feedback Section */}
                      <Box sx={{ mb: 1 }}>
                        {submission.feedback ? (
                          <Alert severity="info" icon={<FeedbackIcon />} sx={{ py: 0.2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {t('teacherFeedbackLabel')}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              {submission.feedback}
                            </Typography>
                            {submission.feedbackBy && (
                              <Typography variant="caption" color="text.secondary">
                                - {submission.feedbackBy.name}
                              </Typography>
                            )}
                          </Alert>
                        ) : (
                          <Alert severity="warning">{t('noFeedbackAddedYet')}</Alert>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<FeedbackIcon />}
                          onClick={() => handleOpenFeedbackDialog(submission)}
                          sx={{ mt: 0.8 }}
                          size="small"
                        >
                          {submission.feedback ? t('editFeedback') : t('addFeedback')}
                        </Button>
                      </Box>

                      {/* Grade Section */}
                      <Box>
                        {submission.score !== null ? (
                          <Alert severity="success" icon={<GradeIcon />} sx={{ py: 0.2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {t('scoreOutOf100', { score: submission.score })}
                            </Typography>
                            {submission.gradedBy && (
                              <Typography variant="caption" color="text.secondary">
                                - {submission.gradedBy.name}
                              </Typography>
                            )}
                          </Alert>
                        ) : (
                          <Alert severity="warning">{t('notEvaluatedYet')}</Alert>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.8, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AssessmentIcon />}
                            onClick={() => handleOpenDigitalEvaluation(submission)}
                            size="small"
                          >
                            {t('digitalEvaluation')}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<GradeIcon />}
                            onClick={() => handleOpenGradeDialog(submission)}
                            size="small"
                          >
                            {submission.score !== null ? t('editScore') : t('addScore')}
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onClose={() => setFeedbackDialog({ open: false, submission: null, feedback: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addOrEditFeedback')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('feedback')}
            value={feedbackDialog.feedback}
            onChange={(e) => setFeedbackDialog({ ...feedbackDialog, feedback: e.target.value })}
            multiline
            rows={4}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ open: false, submission: null, feedback: '' })}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmitFeedback} variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={gradeDialog.open} onClose={() => setGradeDialog({ open: false, submission: null, score: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addOrEditScore')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('score0To100')}
            type="number"
            value={gradeDialog.score}
            onChange={(e) => setGradeDialog({ ...gradeDialog, score: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
            inputProps={{ min: 0, max: 100, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialog({ open: false, submission: null, score: '' })}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmitGrade} variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Retry Confirmation Dialog */}
      <Dialog open={teamRetryDialog.open} onClose={() => setTeamRetryDialog({ open: false, team: null })} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد فتح إعادة المحاولة للفريق</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            هل تريد فتح إعادة المحاولة لفريق <strong>{teamRetryDialog.team?.name}</strong> في جميع المراحل؟
          </Alert>
          <Typography variant="body2" color="text.secondary">
            • سيتم فتح إعادة المحاولة لكل أعضاء الفريق
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • سيتم إعادة فتح مرحلة التسليم النهائي للفريق
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • لن يتم حذف التسليمات السابقة للمراحل الأخرى
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamRetryDialog({ open: false, team: null })}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirmTeamRetry} variant="contained" color="error">
            تأكيد فتح إعادة المحاولة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectSubmissionsManagement;
