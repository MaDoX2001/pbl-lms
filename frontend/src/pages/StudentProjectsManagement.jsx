import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Lock as LockIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  EmojiEvents as TrophyIcon,
  History as HistoryIcon,
  Feedback as FeedbackIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import FinalEvaluationSummary from '../components/FinalEvaluationSummary';
import EvaluationProgressBar from '../components/EvaluationProgressBar';
import SmartEvaluationButton from '../components/SmartEvaluationButton';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * StudentProjectsManagement Component
 * 
 * Centralized evaluation hub for teachers/admins:
 * - View all teams and their projects
 * - Phase 1 (Group) and Phase 2 (Individual) evaluation
 * - Track evaluation status
 * - View final evaluations
 * 
 * Access: Teacher/Admin only
 */
const StudentProjectsManagement = () => {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [teams, setTeams] = useState([]);
  const [teamProjects, setTeamProjects] = useState({});
  const [evaluationStatus, setEvaluationStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [selectedFinalEval, setSelectedFinalEval] = useState(null);
  const [finalEvalDialogOpen, setFinalEvalDialogOpen] = useState(false);
  const [teamAIHistoryDialog, setTeamAIHistoryDialog] = useState({
    open: false,
    team: null,
    project: null
  });
  const [teamAIHistoryState, setTeamAIHistoryState] = useState({
    loading: false,
    data: []
  });
  const [teamFeedbackApplying, setTeamFeedbackApplying] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams');
      const teamsData = response.data.data || [];
      setTeams(teamsData);
      
      // Fetch projects for each team
      const projectsMap = {};
      const statusMap = {};
      
      for (const team of teamsData) {
        try {
          const projectsResponse = await api.get(`/team-projects/team/${team._id}`);
          const projects = projectsResponse.data.data || [];
          projectsMap[team._id] = projects;

          // Fetch evaluation status for each project
          for (const enrollment of projects) {
            const projectId = enrollment.project?._id;
            if (projectId) {
              try {
                // Check Phase 1 status
                const phase1Res = await api.get(`/assessment/group-status/${projectId}/${team._id}`);
                const phase1Complete = phase1Res.data.data?.phase1Complete || false;

                // Check Phase 2 status for each member
                const memberStatuses = [];
                for (const member of team.members || []) {
                  try {
                    const memberId = member.user?._id || member._id;
                    const memberName = member.user?.name || member.name || 'Unknown';
                    const phase2Res = await api.get(`/assessment/individual-status/${projectId}/${memberId}`);
                    const phase2Complete = phase2Res.data.data?.phase2Complete || false;
                    
                    // Check final evaluation
                    let finalEval = null;
                    try {
                      const finalRes = await api.get(`/assessment/final/${projectId}/${memberId}`);
                      finalEval = finalRes.data.data;
                    } catch (err) {
                      // Final eval doesn't exist yet
                    }

                    memberStatuses.push({
                      studentId: memberId,
                      studentName: memberName,
                      phase2Complete,
                      finalEval
                    });
                  } catch (err) {
                    const memberId = member.user?._id || member._id;
                    const memberName = member.user?.name || member.name || 'Unknown';
                    memberStatuses.push({
                      studentId: memberId,
                      studentName: memberName,
                      phase2Complete: false,
                      finalEval: null
                    });
                  }
                }

                statusMap[`${team._id}_${projectId}`] = {
                  phase1Complete,
                  memberStatuses
                };
              } catch (err) {
                console.error('Error fetching evaluation status:', err);
              }
            }
          }
        } catch (err) {
          projectsMap[team._id] = [];
        }
      }
      
      setTeamProjects(projectsMap);
      setEvaluationStatus(statusMap);
      setLoading(false);
    } catch (err) {
      toast.error(t('failedToLoadTeams'));
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const handleViewSubmissions = (projectId) => {
    navigate(`/projects/${projectId}/submissions`);
  };

  const handlePhase1Evaluation = async (projectId, teamId, submissionId) => {
    // Check if observation card exists
    try {
      await api.get(`/assessment/observation-card/${projectId}/group`);
      navigate(`/evaluate/group/${projectId}/${teamId}/${submissionId}`);
    } catch (err) {
      toast.error(t('cannotEvaluateBeforeGroupObservationCard'));
    }
  };

  const handlePhase2Evaluation = async (projectId, studentId, submissionId) => {
    // Check required observation cards before navigation
    try {
      await api.get(`/assessment/observation-card/${projectId}/group`);
      await api.get(`/assessment/observation-card/${projectId}/individual_oral`);

      navigate(`/evaluate/individual/${projectId}/${studentId}/${submissionId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('cannotEvaluateBeforeIndividualObservationCard'));
    }
  };

  const handleViewFinalEvaluation = async (projectId, studentId) => {
    setSelectedFinalEval({ projectId, studentId });
    setFinalEvalDialogOpen(true);
  };

  const handleFinalize = async (projectId, studentId) => {
    try {
      await api.post('/assessment/finalize', {
        projectId,
        studentId
      });
      toast.success(t('finalEvaluationCalculatedSuccess'));
      fetchTeams(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || t('finalEvaluationCalculateFailed'));
    }
  };

  const handleAllowRetry = async (projectId, studentId) => {
    try {
      await api.post('/assessment/allow-retry', {
        projectId,
        studentId
      });
      toast.success(t('retryAllowedSuccess'));
      fetchTeams(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.message || t('retryAllowFailed'));
    }
  };

  const handleOpenTeamAIHistory = async (team, project) => {
    if (!team?._id || !project?._id) return;

    setTeamAIHistoryDialog({ open: true, team, project });
    setTeamAIHistoryState({ loading: true, data: [] });

    try {
      const res = await api.get(`/assessment/team-history/${project._id}/${team._id}`);
      setTeamAIHistoryState({ loading: false, data: res.data?.data || [] });
    } catch (err) {
      setTeamAIHistoryState({ loading: false, data: [] });
      toast.error(err.response?.data?.message || 'فشل تحميل سجل AI للفريق');
    }
  };

  const handleApplyTeamFeedbackBulk = async (historyItem) => {
    const teamId = teamAIHistoryDialog.team?._id;
    const projectId = teamAIHistoryDialog.project?._id;
    const feedbackText = String(historyItem?.feedbackSummary || '').trim();

    if (!teamId || !projectId) {
      toast.error('بيانات الفريق أو المشروع غير مكتملة');
      return;
    }

    if (!feedbackText) {
      toast.error('لا يوجد فيدباك صالح في هذه المحاولة');
      return;
    }

    setTeamFeedbackApplying(true);
    try {
      const submissionsRes = await api.get(`/team-submissions/team/${teamId}/project/${projectId}`);
      const teamSubmissions = submissionsRes.data?.data || [];

      if (!teamSubmissions.length) {
        toast.error('لا توجد تسليمات للفريق لتطبيق الفيدباك عليها');
        setTeamFeedbackApplying(false);
        return;
      }

      for (const submission of teamSubmissions) {
        await api.put(`/team-submissions/${submission._id}/feedback`, {
          feedback: feedbackText,
          source: 'ai-assisted'
        });
      }

      toast.success('تم اعتماد الفيدباك على كل تسليمات الفريق');
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل اعتماد الفيدباك جماعيا');
    } finally {
      setTeamFeedbackApplying(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', minHeight: '60vh', alignItems: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('studentProjectsEvaluationHubTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('studentProjectsEvaluationHubSubtitle')}
        </Typography>
      </Paper>

      {teams.length === 0 ? (
        <Alert severity="info">{t('noTeamsYet')}</Alert>
      ) : (
        <Box>
          {teams.map((team) => {
            const projects = teamProjects[team._id] || [];
            
            return (
              <Accordion
                key={team._id}
                expanded={expandedTeam === team._id}
                onChange={() => handleTeamChange(team._id)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <GroupsIcon color="primary" />
                    <Typography variant="h6">{team.name}</Typography>
                    <Chip
                      label={t('teamMembersCount', { count: team.members?.length || 0 })}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={t('projectsCount', { count: projects.length })}
                      size="small"
                      color="secondary"
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  {/* Team Members */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('teamMembersLabel')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {team.members?.map((member) => (
                        <Chip
                          key={member.user?._id || member._id}
                          icon={<PersonIcon />}
                          label={member.user?.name || member.name || 'Unknown'}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Team Projects with Evaluation Status */}
                  {projects.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {t('teamNoProjectsYet')}
                    </Alert>
                  ) : (
                    <Box>
                      {projects.map((enrollment) => {
                        const project = enrollment.project;
                        if (!project) return null;

                        const statusKey = `${team._id}_${project._id}`;
                        const status = evaluationStatus[statusKey] || {
                          phase1Complete: false,
                          memberStatuses: []
                        };

                        return (
                          <Paper key={enrollment._id} variant="outlined" sx={{ mb: 3, p: 2 }}>
                            {/* Project Header */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <AssignmentIcon color="action" />
                                <Typography variant="h6">{project.title}</Typography>
                                <Chip
                                  label={project.difficulty || t('notSpecified')}
                                  size="small"
                                  color={
                                    project.difficulty === 'easy' ? 'success' :
                                    project.difficulty === 'medium' ? 'warning' :
                                    project.difficulty === 'hard' ? 'error' : 'default'
                                  }
                                />
                              </Box>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewSubmissions(project._id)}
                              >
                                {t('viewSubmissions')}
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="secondary"
                                startIcon={<HistoryIcon />}
                                onClick={() => handleOpenTeamAIHistory(team, project)}
                              >
                                فيدباك AI
                              </Button>
                            </Box>

                            {/* Phase 1: Group Evaluation Status */}
                            <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <GroupsIcon sx={{ color: 'primary.contrastText' }} />
                                  <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'primary.contrastText' }}>
                                    {t('groupEvaluationPhaseOneTitle')}
                                  </Typography>
                                  {status.phase1Complete ? (
                                    <Chip
                                      icon={<CheckCircleIcon />}
                                      label={t('completed')}
                                      color="success"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      icon={<HourglassEmptyIcon />}
                                      label={t('waitingStatus')}
                                      color="warning"
                                      size="small"
                                    />
                                  )}
                                </Box>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color={status.phase1Complete ? "success" : "primary"}
                                  onClick={() => handlePhase1Evaluation(project._id, team._id, enrollment._id)}
                                >
                                  {status.phase1Complete ? t('reEvaluateGroup') : t('startGroupEvaluation')}
                                </Button>
                              </Box>
                            </Box>

                            {/* Phase 2: Individual Evaluations per Student */}
                            <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: 'secondary.contrastText' }}>
                                {t('individualOralEvaluationPhaseTwoTitle')}
                              </Typography>

                              <TableContainer component={Paper} sx={{ mt: 2 }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>{t('studentName')}</strong></TableCell>
                                      <TableCell align="center"><strong>{t('individualEvaluationStatus')}</strong></TableCell>
                                      <TableCell align="center"><strong>{t('actions')}</strong></TableCell>
                                      <TableCell align="center"><strong>{t('finalEvaluationTitle')}</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {team.members?.map((member) => {
                                      const memberId = member.user?._id || member._id;
                                      const memberName = member.user?.name || member.name || 'Unknown';
                                      const memberStatus = status.memberStatuses.find(
                                        m => m.studentId === memberId
                                      ) || {
                                        phase2Complete: false,
                                        finalEval: null
                                      };

                                      const phase2Blocked = !status.phase1Complete;
                                      const canFinalize = status.phase1Complete && memberStatus.phase2Complete && !memberStatus.finalEval;
                                      const hasFinalEval = !!memberStatus.finalEval;

                                      return (
                                        <TableRow key={memberId}>
                                          <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <PersonIcon fontSize="small" color="action" />
                                              {memberName}
                                            </Box>
                                          </TableCell>
                                          <TableCell align="center">
                                            {phase2Blocked ? (
                                              <Chip
                                                icon={<LockIcon />}
                                                label={t('blockedCompletePhaseOne')}
                                                color="error"
                                                size="small"
                                              />
                                            ) : memberStatus.phase2Complete ? (
                                              <Chip
                                                icon={<CheckCircleIcon />}
                                                label={t('completed')}
                                                color="success"
                                                size="small"
                                              />
                                            ) : (
                                              <Chip
                                                icon={<HourglassEmptyIcon />}
                                                label={t('waitingStatus')}
                                                color="warning"
                                                size="small"
                                              />
                                            )}
                                          </TableCell>
                                          <TableCell align="center">
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                              <Button
                                                variant="contained"
                                                size="small"
                                                color="secondary"
                                                disabled={phase2Blocked}
                                                onClick={() => handlePhase2Evaluation(project._id, memberId, enrollment._id)}
                                              >
                                                {memberStatus.phase2Complete ? t('reEvaluate') : t('individualEvaluationTitleShort')}
                                              </Button>
                                              {canFinalize && (
                                                <Button
                                                  variant="outlined"
                                                  size="small"
                                                  color="primary"
                                                  onClick={() => handleFinalize(project._id, memberId)}
                                                >
                                                  {t('calculateFinal')}
                                                </Button>
                                              )}
                                            </Box>
                                          </TableCell>
                                          <TableCell align="center">
                                            {hasFinalEval ? (
                                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center' }}>
                                                <Chip
                                                  icon={memberStatus.finalEval.status === 'passed' ? <TrophyIcon /> : null}
                                                  label={memberStatus.finalEval.verbalGrade}
                                                  color={memberStatus.finalEval.status === 'passed' ? 'success' : 'error'}
                                                  size="small"
                                                />
                                                <Button
                                                  variant="text"
                                                  size="small"
                                                  onClick={() => handleViewFinalEvaluation(project._id, memberId)}
                                                >
                                                  {t('view')}
                                                </Button>
                                                {memberStatus.finalEval.status === 'failed' && (
                                                  <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleAllowRetry(project._id, memberId)}
                                                  >
                                                    {t('allowRetry')}
                                                  </Button>
                                                )}
                                              </Box>
                                            ) : (
                                              <Typography variant="caption" color="text.secondary">
                                                {t('notCompletedYet')}
                                              </Typography>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          </Paper>
                        );
                      })}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Final Evaluation Dialog */}
      <Dialog
        open={finalEvalDialogOpen}
        onClose={() => setFinalEvalDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('finalEvaluationTitle')}</DialogTitle>
        <DialogContent>
          {selectedFinalEval && (
            <FinalEvaluationSummary
              projectId={selectedFinalEval.projectId}
              studentId={selectedFinalEval.studentId}
              showActions={true}
              onRetryAllowed={() => {
                handleAllowRetry(selectedFinalEval.projectId, selectedFinalEval.studentId);
                setFinalEvalDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalEvalDialogOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={teamAIHistoryDialog.open}
        onClose={() => {
          setTeamAIHistoryDialog({ open: false, team: null, project: null });
          setTeamAIHistoryState({ loading: false, data: [] });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          تقييم الفيدباك - {teamAIHistoryDialog.team?.name || ''} | {teamAIHistoryDialog.project?.title || ''}
        </DialogTitle>
        <DialogContent dividers>
          {teamAIHistoryState.loading ? (
            <Alert severity="info">جاري تحميل السجل...</Alert>
          ) : teamAIHistoryState.data.length === 0 ? (
            <Alert severity="info">لا توجد محاولات AI محفوظة لهذا الفريق في هذا المشروع.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {teamAIHistoryState.data.map((item, index) => {
                const feedbackText = String(item.feedbackSummary || '').trim();
                return (
                  <Paper key={item._id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {item.phase === 'group' ? 'تقييم جماعي' : 'تقييم فردي'} - محاولة #{item.attemptNumber}
                      </Typography>
                      <Chip
                        label={item.evaluationSource || 'manual'}
                        size="small"
                        color={String(item.evaluationSource || '').startsWith('ai') ? 'secondary' : 'default'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {new Date(item.createdAt).toLocaleString('ar-EG')} | بواسطة: {item.evaluator?.name || 'غير معروف'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>
                      {feedbackText || 'لا يوجد فيدباك محفوظ في هذه المحاولة.'}
                    </Typography>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<FeedbackIcon />}
                      disabled={!feedbackText || teamFeedbackApplying}
                      onClick={() => handleApplyTeamFeedbackBulk(item)}
                    >
                      {teamFeedbackApplying ? 'جاري الاعتماد...' : 'اعتماد الفيدباك على كل تسليمات الفريق'}
                    </Button>
                    {index === 0 && <Chip label="الأحدث" color="success" size="small" sx={{ ml: 1 }} />}
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTeamAIHistoryDialog({ open: false, team: null, project: null });
            setTeamAIHistoryState({ loading: false, data: [] });
          }}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentProjectsManagement;
