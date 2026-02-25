import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Typography,
  Chip,
  styled
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Person as PersonIcon,
  EmojiEvents as TrophyIcon,
  Lock as LockIcon,
  Pending as PendingIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { stepConnectorClasses } from '@mui/material/StepConnector';
import { useAppSettings } from '../context/AppSettingsContext';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
    backgroundImage: 'linear-gradient(95deg, #2196f3 0%, #21CBF3 50%, #2196f3 100%)',
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    backgroundImage: 'linear-gradient(95deg, #4caf50 0%, #8bc34a 50%, #4caf50 100%)',
  },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage: 'linear-gradient(136deg, #2196f3 0%, #21CBF3 50%, #2196f3 100%)',
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: 'linear-gradient(136deg, #4caf50 0%, #8bc34a 50%, #4caf50 100%)',
  }),
  ...(ownerState.retry && {
    backgroundImage: 'linear-gradient(136deg, #ff9800 0%, #ffc107 50%, #ff9800 100%)',
  }),
}));

function ColorlibStepIcon(props) {
  const { active, completed, className, icon, retry } = props;

  const icons = {
    1: <GroupsIcon />,
    2: <PersonIcon />,
    3: <TrophyIcon />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active, retry }} className={className}>
      {retry ? <RefreshIcon /> : icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

/**
 * EvaluationProgressBar Component
 * 
 * Visual progress indicator for the two-phase evaluation system:
 * Phase 1: Group Evaluation → Phase 2: Individual Evaluation → Final Result
 * 
 * @param {object} status - Evaluation status object
 * @param {boolean} status.phase1Complete - Phase 1 completion status
 * @param {boolean} status.phase2Complete - Phase 2 completion status
 * @param {boolean} status.finalComplete - Final evaluation status
 * @param {boolean} status.retry - Retry indicator
 * @param {string} status.finalStatus - 'passed' | 'failed'
 * @param {boolean} isTeamProject - Whether it's a team project (shows/hides Phase 1)
 */
const EvaluationProgressBar = ({ 
  status = {}, 
  isTeamProject = true 
}) => {
  const { t } = useAppSettings();
  const {
    phase1Complete = false,
    phase2Complete = false,
    finalComplete = false,
    retry = false,
    finalStatus = null
  } = status;

  // Calculate active step
  let activeStep = 0;
  if (finalComplete) activeStep = 3;
  else if (phase2Complete) activeStep = 2;
  else if (phase1Complete) activeStep = 1;

  const steps = isTeamProject ? [
    { label: t('groupEvaluationTitleShort'), icon: 1 },
    { label: t('individualEvaluationTitleShort'), icon: 2 },
    { label: t('finalResult'), icon: 3 }
  ] : [
    { label: t('individualEvaluationTitleShort'), icon: 2 },
    { label: t('finalResult'), icon: 3 }
  ];

  const getStatusChip = () => {
    if (retry) {
      return <Chip label={t('retry')} color="warning" size="small" icon={<RefreshIcon />} />;
    }
    if (finalComplete) {
      return <Chip 
        label={finalStatus === 'passed' ? t('pass') : t('fail')} 
        color={finalStatus === 'passed' ? 'success' : 'error'} 
        size="small" 
        icon={finalStatus === 'passed' ? <CheckCircleIcon /> : undefined}
      />;
    }
    if (phase2Complete) {
      return <Chip label={t('waitingStatus')} color="info" size="small" icon={<PendingIcon />} />;
    }
    if (phase1Complete) {
      return <Chip label={t('phaseTwo')} color="primary" size="small" />;
    }
    return <Chip label={t('phaseOne')} color="default" size="small" />;
  };

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('evaluationStatusTitle')}
        </Typography>
        {getStatusChip()}
      </Box>
      
      <Stepper 
        alternativeLabel 
        activeStep={activeStep} 
        connector={<ColorlibConnector />}
      >
        {steps.map((step, index) => (
          <Step key={step.label} completed={index < activeStep}>
            <StepLabel
              StepIconComponent={(props) => (
                <ColorlibStepIcon 
                  {...props} 
                  icon={step.icon}
                  retry={retry && finalComplete && index === steps.length - 1}
                />
              )}
            >
              <Typography variant="caption" sx={{ fontWeight: index === activeStep - 1 ? 600 : 400 }}>
                {step.label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default EvaluationProgressBar;
