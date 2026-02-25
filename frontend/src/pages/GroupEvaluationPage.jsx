import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Link
} from '@mui/material';
import { NavigateNext as NavigateNextIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAppSettings } from '../context/AppSettingsContext';

const GroupEvaluationPage = () => {
  const { projectId, teamId, submissionId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppSettings();

  const [loading, setLoading] = useState(true);
  const [observationCard, setObservationCard] = useState(null);
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [selections, setSelections] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId, teamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch observation card
      const cardRes = await axios.get(`/api/assessment/observation-card/${projectId}/group`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setObservationCard(cardRes.data.data);

      // Fetch project details
      const projectRes = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProject(projectRes.data.data);

      // Fetch team details
      const teamRes = await axios.get(`/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTeam(teamRes.data.data);

      // Initialize selections
      const initialSelections = {};
      cardRes.data.data.sections.forEach(section => {
        section.criteria.forEach(criterion => {
          initialSelections[`${section.name}_${criterion.name}`] = {
            sectionName: section.name,
            criterionName: criterion.name,
            selectedPercentage: null,
            selectedDescription: ''
          };
        });
      });
      setSelections(initialSelections);

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
        sectionName,
        criterionName,
        selectedPercentage: percentage,
        selectedDescription: description
      }
    }));
  };

  const calculatePreviewScore = () => {
    if (!observationCard) return 0;

    let totalScore = 0;
    observationCard.sections.forEach(section => {
      const criteriaCount = section.criteria.length;
      let sumPercentages = 0;
      
      section.criteria.forEach(criterion => {
        const key = `${section.name}_${criterion.name}`;
        const selection = selections[key];
        if (selection && selection.selectedPercentage !== null) {
          sumPercentages += selection.selectedPercentage;
        }
      });

      const avgPercentage = sumPercentages / criteriaCount;
      const sectionScore = avgPercentage * (section.weight / 100);
      totalScore += sectionScore;
    });

    return totalScore.toFixed(2);
  };

  const handleSubmit = async () => {
    setError('');

    // Validate all criteria selected
    const allSelected = Object.values(selections).every(
      sel => sel.selectedPercentage !== null
    );

    if (!allSelected) {
      setError(t('mustSelectScoreForEachCriterion'));
      return;
    }

    try {
      setSubmitting(true);

      // Group selections by section
      const sectionEvaluations = [];
      observationCard.sections.forEach(section => {
        const criterionSelections = section.criteria.map(criterion => {
          const key = `${section.name}_${criterion.name}`;
          return selections[key];
        });
        
        sectionEvaluations.push({
          sectionName: section.name,
          criterionSelections
        });
      });

      await axios.post('/api/assessment/evaluate-group', {
        projectId,
        teamId,
        submissionId,
        sectionEvaluations,
        feedbackSummary
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert(t('groupEvaluationSavedSuccess'));
      navigate(`/projects/${projectId}/submissions`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('evaluationSaveFailed'));
      setSubmitting(false);
    }
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
        <Typography color="text.primary">{t('groupEvaluationTitleShort')}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              {t('groupEvaluationPhaseOneTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('projectWithValue', { project: project?.title })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('teamWithValue', { team: team?.name })}
            </Typography>
          </Box>
          <Chip label={t('phaseOne')} color="primary" size="large" />
        </Box>

        <Alert severity="info">
          {t('groupEvaluationInfoAlert')}
        </Alert>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Preview Score */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6">
          {t('calculatedScoreOutOf100', { score: calculatePreviewScore() })}
        </Typography>
      </Paper>

      {/* Evaluation Sections */}
      {observationCard.sections.map((section, sectionIndex) => (
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
                  <TableCell width="30%"><strong>{t('criterion')}</strong></TableCell>
                  <TableCell width="60%"><strong>{t('options')}</strong></TableCell>
                  <TableCell width="10%" align="center"><strong>{t('scoreLabel')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.criteria.map((criterion, criterionIndex) => {
                  const key = `${section.name}_${criterion.name}`;
                  const selected = selections[key];

                  return (
                    <TableRow key={criterionIndex}>
                      <TableCell>
                        <Typography fontWeight={600}>{criterion.name}</Typography>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={selected?.selectedPercentage !== null ? `${selected.selectedPercentage}%` : '-'}
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

      {/* Feedback */}
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
          placeholder={t('teamFeedbackPlaceholder')}
        />
      </Paper>

      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate(`/projects/${projectId}/submissions`)}
          disabled={submitting}
        >
          {t('cancel')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t('saving') : t('saveGroupEvaluation')}
        </Button>
      </Box>
    </Box>
  );
};

export default GroupEvaluationPage;
