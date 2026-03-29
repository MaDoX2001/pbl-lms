import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Breadcrumbs,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider
} from '@mui/material';
import { NavigateNext as NavigateNextIcon, Lock as LockIcon, ArrowBack as ArrowBackIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAppSettings } from '../context/AppSettingsContext';

const IndividualEvaluationPage = () => {
  const { projectId, studentId, submissionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useAppSettings();
  const roleLabels = {
    system_designer: t('roleSystemDesigner'),
    hardware_engineer: t('roleHardwareEngineer'),
    programmer: t('roleProgrammer')
  };

  const [loading, setLoading] = useState(true);
  const [observationCard, setObservationCard] = useState(null);
  const [groupObservationCard, setGroupObservationCard] = useState(null);
  const [project, setProject] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentRole, setStudentRole] = useState('');
  const [phase1Status, setPhase1Status] = useState(null);
  const [selections, setSelections] = useState({});
  const [groupSelections, setGroupSelections] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState('');

  const isAllRolesMode = Boolean(project && !project.isTeamProject);
  const canStartEvaluation = isAllRolesMode || Boolean(studentRole);

  useEffect(() => {
    fetchData();
  }, [projectId, studentId]);

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    if (params.get('ai') === '1') {
      handleOpenAIEvaluation(true);
    }
  }, [loading, location.search]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectRes = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProject(projectRes.data.data);

      // If team project, check Phase 1 completion
      if (projectRes.data.data.isTeamProject) {
        // Fetch student to get team
        const studentRes = await axios.get(`/api/users/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStudent(studentRes.data.data);

        // Find team
        const teamsRes = await axios.get(`/api/teams/project/${projectId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const studentTeam = teamsRes.data.data.find(team =>
          team.members.some(m => m._id === studentId || m === studentId)
        );

        if (studentTeam) {
          // Check Phase 1 status
          const statusRes = await axios.get(`/api/assessment/group-status/${projectId}/${studentTeam._id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPhase1Status(statusRes.data.data);
        }
      } else {
        // Individual project - no Phase 1 check needed
        const studentRes = await axios.get(`/api/users/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStudent(studentRes.data.data);
        setPhase1Status({ phase1Complete: true }); // Skip Phase 1 for individual projects
        setStudentRole('programmer'); // Stored role is required by schema, but all criteria are enforced for individual projects
      }
      
      // Fetch phase 2 observation card
      const cardRes = await axios.get(`/api/assessment/observation-card/${projectId}/individual_oral`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setObservationCard(cardRes.data.data);

      // Initialize selections
      const initialSelections = {};
      cardRes.data.data.sections.forEach(section => {
        section.criteria.forEach(criterion => {
          initialSelections[`${section.name}_${criterion.name}`] = {
            sectionName: section.name,
            criterionName: criterion.name,
            applicableRoles: criterion.applicableRoles,
            selectedPercentage: null,
            selectedDescription: ''
          };
        });
      });
      setSelections(initialSelections);

      // For individual projects, evaluate by both cards (group + individual)
      if (!projectRes.data.data.isTeamProject) {
        const groupCardRes = await axios.get(`/api/assessment/observation-card/${projectId}/group`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setGroupObservationCard(groupCardRes.data.data);

        const initialGroupSelections = {};
        groupCardRes.data.data.sections.forEach(section => {
          section.criteria.forEach(criterion => {
            initialGroupSelections[`${section.name}_${criterion.name}`] = {
              sectionName: section.name,
              criterionName: criterion.name,
              applicableRoles: criterion.applicableRoles,
              selectedPercentage: null,
              selectedDescription: ''
            };
          });
        });
        setGroupSelections(initialGroupSelections);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('evaluationLoadFailed'));
      setLoading(false);
    }
  };

  const handleSelection = (sectionName, criterionName, percentage, description) => {
    const key = `${sectionName}_${criterionName}`;
    setSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        selectedPercentage: percentage,
        selectedDescription: description
      }
    }));
  };

  const handleGroupSelection = (sectionName, criterionName, percentage, description) => {
    const key = `${sectionName}_${criterionName}`;
    setGroupSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        selectedPercentage: percentage,
        selectedDescription: description
      }
    }));
  };

  const isCriterionRequired = (criterion) => {
    if (isAllRolesMode) return true;
    if (!studentRole) return false;
    return criterion.applicableRoles.includes('all') || 
           criterion.applicableRoles.includes(studentRole);
  };

  const calculateCardScore = (card, cardSelections) => {
    if (!card) return 0;

    let totalScore = 0;
    card.sections.forEach(section => {
      let sumPercentages = 0;
      let requiredCount = 0;

      section.criteria.forEach(criterion => {
        const key = `${section.name}_${criterion.name}`;
        const selection = cardSelections[key];
        const isRequired = isCriterionRequired(criterion);

        if (isRequired) {
          requiredCount++;
          if (selection && selection.selectedPercentage !== null) {
            sumPercentages += selection.selectedPercentage;
          }
        }
      });

      if (requiredCount > 0) {
        const avgPercentage = sumPercentages / requiredCount;
        const sectionScore = avgPercentage * (section.weight / 100);
        totalScore += sectionScore;
      }
    });

    return totalScore;
  };

  const calculatePreviewScore = () => {
    if (!observationCard || !canStartEvaluation) return 0;

    const individualScore = calculateCardScore(observationCard, selections);
    if (isAllRolesMode && groupObservationCard) {
      const groupScore = calculateCardScore(groupObservationCard, groupSelections);
      return ((groupScore + individualScore) / 2).toFixed(2);
    }

    return individualScore.toFixed(2);
  };

  const buildSectionEvaluations = (card, cardSelections) => {
    const sectionEvaluations = [];
    (card?.sections || []).forEach((section) => {
      const criterionSelections = (section.criteria || []).map((criterion) => {
        const key = `${section.name}_${criterion.name}`;
        return cardSelections[key];
      });

      sectionEvaluations.push({
        sectionName: section.name,
        criterionSelections
      });
    });
    return sectionEvaluations;
  };

  const draftToSectionEvaluations = (cardDraft) => {
    return (cardDraft?.sectionEvaluations || []).map((section) => ({
      sectionName: section.sectionName,
      criterionSelections: (section.criterionSelections || []).map((criterion) => ({
        criterionName: criterion.criterionName,
        selectedPercentage: criterion.selectedPercentage,
        selectedDescription: criterion.selectedDescription || ''
      }))
    }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!canStartEvaluation) {
      setError(t('studentRoleRequired'));
      return;
    }

    const allRequiredSelectedForCard = (card, cardSelections) => {
      if (!card) return true;
      return Object.entries(cardSelections).every(([key, sel]) => {
        const [sectionName, criterionName] = key.split('_');
        const section = card.sections.find(s => s.name === sectionName);
        const criterion = section?.criteria.find(c => c.name === criterionName);

        if (!criterion) return true;

        const required = isCriterionRequired(criterion);
        if (!required) return true;

        return sel.selectedPercentage !== null;
      });
    };

    const individualCardValid = allRequiredSelectedForCard(observationCard, selections);
    const groupCardValid = !isAllRolesMode || allRequiredSelectedForCard(groupObservationCard, groupSelections);

    if (!individualCardValid || !groupCardValid) {
      setError(t('requiredCriteriaScoreMissing'));
      return;
    }

    try {
      setSubmitting(true);

      // In individual projects, evaluate with both observation cards
      if (isAllRolesMode && groupObservationCard) {
        await axios.post('/api/assessment/evaluate-group', {
          projectId,
          studentId,
          submissionId,
          sectionEvaluations: buildSectionEvaluations(groupObservationCard, groupSelections),
          feedbackSummary
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      await axios.post('/api/assessment/evaluate-individual', {
        projectId,
        studentId,
        studentRole: studentRole || 'programmer',
        submissionId,
        sectionEvaluations: buildSectionEvaluations(observationCard, selections),
        feedbackSummary
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(t('individualEvaluationSavedSuccess'));
      navigate(`/projects/${projectId}/submissions`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('evaluationSaveFailed'));
      setSubmitting(false);
    }
  };

  const applyCardToSelections = (cardDraft, setState) => {
    if (!cardDraft?.sectionEvaluations?.length) return;
    setState((prev) => {
      const next = { ...prev };
      cardDraft.sectionEvaluations.forEach((section) => {
        (section.criterionSelections || []).forEach((criterion) => {
          const key = `${section.sectionName}_${criterion.criterionName}`;
          if (!next[key]) return;
          next[key] = {
            ...next[key],
            selectedPercentage: typeof criterion.selectedPercentage === 'number' ? criterion.selectedPercentage : null,
            selectedDescription: criterion.selectedDescription || ''
          };
        });
      });
      return next;
    });
  };

  const handleOpenAIEvaluation = async (autoOpen = false) => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiError('');

    try {
      const res = await axios.post('/api/assessment/ai-evaluate-individual', {
        projectId,
        studentId,
        submissionId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setAiData(res.data?.data || null);
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل في توليد تقييم AI';
      setAiError(msg);
      if (!autoOpen) {
        alert(msg);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleApproveAIEvaluation = () => {
    if (!aiData) return;

    const run = async () => {
      try {
        setSubmitting(true);

        applyCardToSelections(aiData.groupCard, setGroupSelections);
        applyCardToSelections(aiData.individualCard, setSelections);
        setStudentRole(aiData.studentRole || 'programmer');

        if (isAllRolesMode && aiData.groupCard) {
          await axios.post('/api/assessment/evaluate-group', {
            projectId,
            studentId,
            submissionId: aiData.basedOnSubmissionId || submissionId,
            sectionEvaluations: draftToSectionEvaluations(aiData.groupCard),
            feedbackSummary,
            evaluationSource: 'ai-assisted',
            aiApproval: {
              confidence: aiData.confidence,
              plagiarismSimilarityPercent: aiData.plagiarism?.similarityPercent,
              plagiarismLevel: aiData.plagiarism?.level,
              rationale: aiData.rationale
            }
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }

        await axios.post('/api/assessment/evaluate-individual', {
          projectId,
          studentId,
          studentRole: 'programmer',
          submissionId: aiData.basedOnSubmissionId || submissionId,
          sectionEvaluations: draftToSectionEvaluations(aiData.individualCard),
          feedbackSummary,
          evaluationSource: 'ai-assisted',
          aiApproval: {
            confidence: aiData.confidence,
            plagiarismSimilarityPercent: aiData.plagiarism?.similarityPercent,
            plagiarismLevel: aiData.plagiarism?.level,
            rationale: aiData.rationale
          }
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        alert('تم اعتماد تقييم AI تلقائيًا وحفظ بطاقات الملاحظة');
        setAiDialogOpen(false);
      } catch (err) {
        const msg = err.response?.data?.message || 'فشل اعتماد تقييم AI';
        setAiError(msg);
        alert(msg);
      } finally {
        setSubmitting(false);
      }
    };

    run();
  };

  const handleApproveAIFeedback = () => {
    if (!aiData?.feedbackSuggestion) return;

    const run = async () => {
      try {
        setSubmitting(true);
        setFeedbackSummary(aiData.feedbackSuggestion);

        if (submissionId) {
          await axios.put(`/api/progress/${submissionId}/feedback`, {
            comments: aiData.feedbackSuggestion,
            allowResubmission: false,
            source: 'ai-assisted',
            aiMeta: {
              confidence: aiData.confidence,
              plagiarismSimilarityPercent: aiData.plagiarism?.similarityPercent,
              plagiarismLevel: aiData.plagiarism?.level
            },
            skipEvaluationCheck: true
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
        }

        alert('تم اعتماد فيدباك AI وحفظه للطالب');
        setAiDialogOpen(false);
      } catch (err) {
        const msg = err.response?.data?.message || 'فشل اعتماد فيدباك AI';
        setAiError(msg);
        alert(msg);
      } finally {
        setSubmitting(false);
      }
    };

    run();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!observationCard) {
    return (
      <Alert severity="error">{t('observationCardNotFound')}</Alert>
    );
  }

  // Phase 1 blocking check
  if (project?.isTeamProject && (!phase1Status || !phase1Status.phase1Complete)) {
    return (
      <Box>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('groupPhaseIncomplete')}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {t('completeGroupPhaseFirst')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/projects/${projectId}/submissions`)}
          >
            {t('backToSubmissionsList')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        {t('back')}
      </Button>

      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/projects">{t('projects')}</Link>
        <Link underline="hover" color="inherit" href={`/projects/${projectId}`}>
          {project?.title}
        </Link>
        <Typography color="text.primary">{t('individualEvaluationTitleShort')}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              {t('individualOralEvaluationPhaseTwoTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('projectWithValue', { project: project?.title })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('studentWithValue', { student: student?.name })}
            </Typography>
          </Box>
          <Chip label={t('phaseTwo')} color="secondary" size="large" />
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          {t('individualEvaluationInfoAlert')}
        </Alert>

        {isAllRolesMode ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            سيتم تقييم الطالب في المشروع الفردي كأنه يغطي كل الأدوار، وباستخدام بطاقتي الملاحظة.
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="student-role-label">{t('studentRole')}</InputLabel>
            <Select
              id="student-role"
              labelId="student-role-label"
              value={studentRole}
              onChange={(e) => setStudentRole(e.target.value)}
              label={t('studentRole')}
            >
              <MenuItem value="">{t('selectRolePlaceholder')}</MenuItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!canStartEvaluation && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('selectStudentRoleToStartEvaluation')}
        </Alert>
      )}

      {/* Preview Score */}
      {canStartEvaluation && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
          <Typography variant="h6">
            {t('calculatedScoreOutOf100', { score: calculatePreviewScore() })}
          </Typography>
        </Paper>
      )}

      {/* Evaluation Sections */}
      {isAllRolesMode && canStartEvaluation && groupObservationCard && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            بطاقة الملاحظة الأولى (الجماعية)
          </Typography>
          {groupObservationCard.sections.map((section, sectionIndex) => (
            <Paper key={`group-${sectionIndex}`} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" fontWeight={600}>
                  {section.name}
                </Typography>
                <Chip label={`${section.weight}%`} color="primary" />
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell width="25%"><strong>{t('criterion')}</strong></TableCell>
                      <TableCell width="10%" align="center"><strong>{t('required')}</strong></TableCell>
                      <TableCell width="55%"><strong>{t('options')}</strong></TableCell>
                      <TableCell width="10%" align="center"><strong>{t('scoreLabel')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {section.criteria.map((criterion, criterionIndex) => {
                      const key = `${section.name}_${criterion.name}`;
                      const selected = groupSelections[key];

                      return (
                        <TableRow key={criterionIndex}>
                          <TableCell>
                            <Typography fontWeight={600}>{criterion.name}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={t('yes')} color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <RadioGroup
                              value={selected?.selectedPercentage?.toString() || ''}
                              onChange={(e) => {
                                const percentage = parseInt(e.target.value, 10);
                                const option = criterion.options.find(o => o.percentage === percentage);
                                handleGroupSelection(
                                  section.name,
                                  criterion.name,
                                  percentage,
                                  option?.description || ''
                                );
                              }}
                            >
                              {criterion.options.map(option => (
                                <FormControlLabel
                                  key={option.percentage}
                                  value={option.percentage.toString()}
                                  control={<Radio />}
                                  label={
                                    <Box>
                                      <Typography variant="body2" fontWeight={600}>
                                        {option.percentage}%
                                      </Typography>
                                      {option.description && (
                                        <Typography variant="caption" color="text.secondary">
                                          {option.description}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              ))}
                            </RadioGroup>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={selected?.selectedPercentage !== null ? `${selected?.selectedPercentage}%` : '-'}
                              color={selected?.selectedPercentage !== null ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
          <Typography variant="h6" sx={{ mb: 2 }}>
            بطاقة الملاحظة الثانية (الفردية والشفوية)
          </Typography>
        </>
      )}

      {canStartEvaluation && observationCard.sections.map((section, sectionIndex) => (
        <Paper key={sectionIndex} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={600}>
              {section.name}
            </Typography>
            <Chip label={`${section.weight}%`} color="secondary" />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="25%"><strong>{t('criterion')}</strong></TableCell>
                  <TableCell width="10%" align="center"><strong>{t('required')}</strong></TableCell>
                  <TableCell width="55%"><strong>{t('options')}</strong></TableCell>
                  <TableCell width="10%" align="center"><strong>{t('scoreLabel')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.criteria.map((criterion, criterionIndex) => {
                  const key = `${section.name}_${criterion.name}`;
                  const selected = selections[key];
                  const isRequired = isCriterionRequired(criterion);

                  return (
                    <TableRow key={criterionIndex} sx={{ opacity: isRequired ? 1 : 0.5 }}>
                      <TableCell>
                        <Typography fontWeight={600}>{criterion.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {criterion.applicableRoles.includes('all') 
                            ? t('allRoles') 
                            : criterion.applicableRoles.map(r => roleLabels[r] || r).join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {isRequired ? (
                          <Chip label={t('yes')} color="success" size="small" />
                        ) : (
                          <Chip label={t('no')} size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isRequired ? (
                          <RadioGroup
                            value={selected?.selectedPercentage?.toString() || ''}
                            onChange={(e) => {
                              const percentage = parseInt(e.target.value);
                              const option = criterion.options.find(o => o.percentage === percentage);
                              handleSelection(
                                section.name,
                                criterion.name,
                                percentage,
                                option?.description || ''
                              );
                            }}
                          >
                            {criterion.options.map(option => (
                              <FormControlLabel
                                key={option.percentage}
                                value={option.percentage.toString()}
                                control={<Radio />}
                                label={
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {option.percentage}%
                                    </Typography>
                                    {option.description && (
                                      <Typography variant="caption" color="text.secondary">
                                        {option.description}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            ))}
                          </RadioGroup>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {t('notRequiredForThisRole')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isRequired ? (
                          <Chip 
                            label={selected?.selectedPercentage !== null ? `${selected.selectedPercentage}%` : '-'}
                            color={selected?.selectedPercentage !== null ? 'success' : 'default'}
                          />
                        ) : (
                          <Chip label={t('notApplicable')} size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* Feedback */}
      {canStartEvaluation && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            {t('generalNotesOptional')}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={feedbackSummary}
            onChange={(e) => setFeedbackSummary(e.target.value)}
            placeholder={t('studentFeedbackPlaceholder')}
          />
        </Paper>
      )}

      {/* Submit Button */}
      {canStartEvaluation && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            color="info"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => handleOpenAIEvaluation(false)}
            disabled={submitting || aiLoading}
          >
            تقييم AI
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate(`/projects/${projectId}/submissions`)}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? t('saving') : t('saveIndividualEvaluation')}
          </Button>
        </Box>
      )}

      <Dialog open={aiDialogOpen} onClose={() => !aiLoading && setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>مراجعة تقييم الذكاء الاصطناعي</DialogTitle>
        <DialogContent dividers>
          {aiLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : aiError ? (
            <Alert severity="error">{aiError}</Alert>
          ) : aiData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="info">
                الدرجة المقترحة: {aiData.overallScore}/100
                {typeof aiData.confidence === 'number' ? ` | ثقة AI: ${aiData.confidence}%` : ''}
              </Alert>

              <Typography variant="body2"><strong>درجة البطاقة الأولى:</strong> {aiData.groupCard?.calculatedScore ?? '-'} / 100</Typography>
              <Typography variant="body2"><strong>درجة البطاقة الثانية:</strong> {aiData.individualCard?.calculatedScore ?? '-'} / 100</Typography>

              <Divider />
              <Typography variant="subtitle2">مبرر الدرجة</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {aiData.rationale || '—'}
              </Typography>

              <Divider />
              <Typography variant="subtitle2">فحص الانتحال البرمجي</Typography>
              <Typography variant="body2" color="text.secondary">
                مستوى الخطورة: {aiData.plagiarism?.level || 'غير معروف'} | نسبة التشابه: {aiData.plagiarism?.similarityPercent ?? 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {aiData.plagiarism?.reason || '—'}
              </Typography>

              <Divider />
              <Typography variant="subtitle2">فيدباك مقترح للطالب</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {aiData.feedbackSuggestion || 'لا يوجد فيدباك مقترح'}
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning">لا توجد نتيجة AI متاحة حالياً.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>{t('cancel')}</Button>
          <Button onClick={() => handleOpenAIEvaluation(false)} disabled={aiLoading} variant="outlined">
            إعادة التقييم
          </Button>
          <Button
            onClick={handleApproveAIFeedback}
            disabled={aiLoading || !aiData?.feedbackSuggestion}
            variant="outlined"
            color="secondary"
          >
            اعتماد الفيدباك
          </Button>
          <Button
            onClick={handleApproveAIEvaluation}
            disabled={aiLoading || !aiData}
            variant="contained"
            color="primary"
          >
            اعتماد التقييم
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IndividualEvaluationPage;
