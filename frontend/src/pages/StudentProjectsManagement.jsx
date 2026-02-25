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
                    const phase2Res = await api.get(`/assessment/individual-status/${projectId}/${member._id}`);
                    const phase2Complete = phase2Res.data.data?.phase2Complete || false;
                    
                    // Check final evaluation
                    let finalEval = null;
                    try {
                      const finalRes = await api.get(`/assessment/final/${projectId}/${member._id}`);
                      finalEval = finalRes.data.data;
                    } catch (err) {
                      // Final eval doesn't exist yet
                    }

                    memberStatuses.push({
                      studentId: member._id,
                      studentName: member.name,
                      phase2Complete,
                      finalEval
                    });
                  } catch (err) {
                    memberStatuses.push({
                      studentId: member._id,
                      studentName: member.name,
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
    // Check if observation card exists
    try {
      await api.get(`/assessment/observation-card/${projectId}/individual_oral`);
      navigate(`/evaluate/individual/${projectId}/${studentId}/${submissionId}`);
    } catch (err) {
      toast.error(t('cannotEvaluateBeforeIndividualObservationCard'));
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
                          key={member._id}
                          icon={<PersonIcon />}
                          label={member.name}
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
                                      const memberStatus = status.memberStatuses.find(
                                        m => m.studentId === member._id
                                      ) || {
                                        phase2Complete: false,
                                        finalEval: null
                                      };

                                      const phase2Blocked = !status.phase1Complete;
                                      const canFinalize = status.phase1Complete && memberStatus.phase2Complete && !memberStatus.finalEval;
                                      const hasFinalEval = !!memberStatus.finalEval;

                                      return (
                                        <TableRow key={member._id}>
                                          <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <PersonIcon fontSize="small" color="action" />
                                              {member.name}
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
                                                onClick={() => handlePhase2Evaluation(project._id, member._id, enrollment._id)}
                                              >
                                                {memberStatus.phase2Complete ? t('reEvaluate') : t('individualEvaluationTitleShort')}
                                              </Button>
                                              {canFinalize && (
                                                <Button
                                                  variant="outlined"
                                                  size="small"
                                                  color="primary"
                                                  onClick={() => handleFinalize(project._id, member._id)}
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
                                                  onClick={() => handleViewFinalEvaluation(project._id, member._id)}
                                                >
                                                  {t('view')}
                                                </Button>
                                                {memberStatus.finalEval.status === 'failed' && (
                                                  <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleAllowRetry(project._id, member._id)}
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
    </Container>
  );
};

export default StudentProjectsManagement;
