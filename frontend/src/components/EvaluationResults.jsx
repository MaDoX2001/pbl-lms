import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { assessmentAPI } from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

const EvaluationResults = ({ submissionId }) => {
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (submissionId) {
      fetchEvaluation();
    }
  }, [submissionId]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const response = await assessmentAPI.getEvaluation(submissionId);
      setEvaluation(response.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setError(t('notEvaluatedYet'));
      } else {
        setError(t('evaluationLoadFailed'));
      }
    } finally {
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
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!evaluation) {
    return null;
  }

  const isPassed = evaluation.status === 'passed';

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        {t('evaluationResult')}
      </Typography>

      {/* Overall Status */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2,
        p: 3,
        bgcolor: isPassed ? 'success.light' : 'error.light',
        borderRadius: 2,
        mb: 3
      }}>
        {isPassed ? (
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
        ) : (
          <CancelIcon sx={{ fontSize: 48, color: 'error.main' }} />
        )}
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {evaluation.finalScore.toFixed(2)}%
          </Typography>
          <Chip 
            label={isPassed ? t('pass') : t('fail')} 
            color={isPassed ? 'success' : 'error'}
            size="large"
          />
        </Box>
      </Box>

      {/* Evaluation Details */}
      <Typography variant="h6" gutterBottom fontWeight={600}>
        {t('evaluationDetails')}
      </Typography>

      {evaluation.assessmentPartEvaluations.map((partEval, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {partEval.partName === 'project_evaluation' && t('projectEvaluation')}
                {partEval.partName === 'individual_evaluation' && t('individualEvaluationTitleShort')}
                {partEval.partName === 'oral_evaluation' && t('oralEvaluation')}
              </Typography>
              <Chip 
                label={`${partEval.calculatedPartScore.toFixed(2)}%`} 
                size="small"
                color="primary"
              />
              <Typography variant="caption" color="text.secondary">
                ({t('weight')}: {partEval.partWeight}%)
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {partEval.sectionEvaluations.map((sectionEval, sIndex) => (
              <Box key={sIndex} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {sectionEval.sectionName} 
                  <Chip 
                    label={`${sectionEval.calculatedSectionScore.toFixed(2)}%`} 
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {sectionEval.criterionSelections.map((critSel, cIndex) => (
                    <Box key={cIndex} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {critSel.criterionName}:
                      </Typography>
                      <Typography variant="body2" sx={{ pl: 1 }}>
                        <strong>{critSel.selectedPercentage}%</strong> - {critSel.selectedDescription}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 1 }} />
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Feedback */}
      {evaluation.feedbackSummary && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            {t('feedback')}
          </Typography>
          <Alert severity="info">
            {evaluation.feedbackSummary}
          </Alert>
        </Box>
      )}

      {/* Retry Info */}
      {!isPassed && evaluation.retryAllowed && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            {t('youCanRetry')}
          </Typography>
          <Typography variant="caption">
            {t('resubmitAfterImprovement')}
          </Typography>
        </Alert>
      )}

      {/* Evaluator Info */}
      {evaluation.evaluator && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('evaluatedBy')}: {evaluation.evaluator.name}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {t('attemptNumberWithValue', { number: evaluation.attemptNumber })}
      </Typography>
    </Paper>
  );
};

export default EvaluationResults;
