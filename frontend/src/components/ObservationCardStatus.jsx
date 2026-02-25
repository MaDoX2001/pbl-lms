import React, { useState, useEffect } from 'react';
import { Alert, Box, Chip, CircularProgress } from '@mui/material';
import { CheckCircle as CheckIcon, Warning as WarningIcon } from '@mui/icons-material';
import axios from 'axios';
import { useAppSettings } from '../context/AppSettingsContext';

const ObservationCardStatus = ({ projectId }) => {
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(true);
  const [groupCardExists, setGroupCardExists] = useState(false);
  const [individualCardExists, setIndividualCardExists] = useState(false);

  useEffect(() => {
    if (projectId) {
      checkCards();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const checkCards = async () => {
    try {
      setLoading(true);
      
      // Check group card
      try {
        await axios.get(`/api/assessment/observation-card/${projectId}/group`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setGroupCardExists(true);
      } catch {
        setGroupCardExists(false);
      }

      // Check individual card
      try {
        await axios.get(`/api/assessment/observation-card/${projectId}/individual_oral`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setIndividualCardExists(true);
      } catch {
        setIndividualCardExists(false);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('observationCardsSavedAfterProjectCreate')}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CircularProgress size={20} />
        <span>{t('checkingObservationCards')}</span>
      </Box>
    );
  }

  const allCardsExist = groupCardExists && individualCardExists;
  const someCardsMissing = !groupCardExists || !individualCardExists;

  return (
    <Box sx={{ mb: 2 }}>
      {allCardsExist && (
        <Alert severity="success" icon={<CheckIcon />}>
          <strong>{t('observationCardsExistLabel')}</strong> {t('teachersCanStartEvaluation')}
        </Alert>
      )}
      
      {someCardsMissing && (
        <Alert severity="warning" icon={<WarningIcon />}>
          <Box>
            <strong>{t('missingObservationCardsLabel')}</strong>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={t('groupEvaluation')}
                color={groupCardExists ? "success" : "error"}
                size="small"
                icon={groupCardExists ? <CheckIcon /> : <WarningIcon />}
              />
              <Chip 
                label={t('individualOralEvaluation')}
                color={individualCardExists ? "success" : "error"}
                size="small"
                icon={individualCardExists ? <CheckIcon /> : <WarningIcon />}
              />
            </Box>
            <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
              {t('cannotEvaluateBeforeMissingCardsCreated')}
            </Box>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default ObservationCardStatus;
