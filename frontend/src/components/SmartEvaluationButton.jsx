import React from 'react';
import {
  Button,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

/**
 * SmartEvaluationButton Component
 * 
 * Intelligent evaluation button that auto-determines which phase to open:
 * - Opens Phase 1 (Group) if not complete
 * - Opens Phase 2 (Individual) if Phase 1 complete
 * - Disabled with explanation if blocked
 * 
 * @param {object} status - Evaluation status
 * @param {function} onStartGroupEval - Handler for Phase 1
 * @param {function} onStartIndividualEval - Handler for Phase 2
 * @param {boolean} isTeamProject - Whether it's a team project
 * @param {boolean} hasObservationCards - Whether observation cards exist
 * @param {boolean} disabled - Manual disable
 */
const SmartEvaluationButton = ({
  status = {},
  onStartGroupEval,
  onStartIndividualEval,
  isTeamProject = true,
  hasObservationCards = true,
  disabled = false
}) => {
  const {
    phase1Complete = false,
    phase2Complete = false,
    finalComplete = false
  } = status;

  // Determine button state
  const getButtonConfig = () => {
    // If observation cards missing
    if (!hasObservationCards) {
      return {
        label: 'بدء التقييم',
        icon: <LockIcon />,
        color: 'default',
        disabled: true,
        tooltip: 'يجب إنشاء بطاقات الملاحظات أولاً',
        onClick: null
      };
    }

    // If final evaluation complete
    if (finalComplete) {
      return {
        label: 'التقييم مكتمل',
        icon: <CheckCircleIcon />,
        color: 'success',
        disabled: true,
        tooltip: 'تم إكمال التقييم النهائي',
        onClick: null
      };
    }

    // If Phase 2 complete, waiting for finalization
    if (phase2Complete) {
      return {
        label: 'في انتظار النتيجة',
        icon: <CheckCircleIcon />,
        color: 'info',
        disabled: true,
        tooltip: 'تم إكمال جميع مراحل التقييم. في انتظار النتيجة النهائية.',
        onClick: null
      };
    }

    // If Phase 1 complete, open Phase 2
    if (phase1Complete || !isTeamProject) {
      return {
        label: 'تقييم فردي',
        icon: <PersonIcon />,
        color: 'secondary',
        disabled: false,
        tooltip: 'بدء التقييم الفردي والشفهي (المرحلة الثانية)',
        onClick: onStartIndividualEval
      };
    }

    // Default: Start Phase 1
    return {
      label: 'تقييم جماعي',
      icon: <GroupsIcon />,
      color: 'primary',
      disabled: false,
      tooltip: 'بدء التقييم الجماعي (المرحلة الأولى)',
      onClick: onStartGroupEval
    };
  };

  const config = getButtonConfig();

  const ButtonComponent = (
    <Button
      variant="contained"
      color={config.color}
      startIcon={config.icon}
      onClick={config.onClick}
      disabled={disabled || config.disabled}
      fullWidth
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        py: 1
      }}
    >
      {config.label}
    </Button>
  );

  // Wrap in tooltip if there's an explanation
  if (config.tooltip) {
    return (
      <Tooltip title={config.tooltip} arrow placement="top">
        <span>
          {ButtonComponent}
        </span>
      </Tooltip>
    );
  }

  return ButtonComponent;
};

export default SmartEvaluationButton;
