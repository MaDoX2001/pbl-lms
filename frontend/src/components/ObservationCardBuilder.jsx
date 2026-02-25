import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Divider,
  Chip,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppSettings } from '../context/AppSettingsContext';

const PERCENTAGE_OPTIONS = [0, 20, 40, 60, 80, 100];

const PHASE_NAMES = {
  group: 'groupPhase',
  individual_oral: 'individualOralPhase'
};

const ROLES = [
  { value: 'all' },
  { value: 'system_designer' },
  { value: 'hardware_engineer' },
  { value: 'programmer' }
];

const ObservationCardBuilder = ({ projectId, phase, isTeamProject, initialData, onSave }) => {
  const { t } = useAppSettings();
  const [sections, setSections] = useState([{
    name: '',
    weight: 100,
    criteria: [{
      name: '',
      applicableRoles: ['all'],
      options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
    }]
  }]);

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData && initialData.sections) {
      setSections(initialData.sections);
    }
  }, [initialData]);


  const addSection = () => {
    setSections([...sections, {
      name: '',
      weight: 0,
      criteria: [{
        name: '',
        applicableRoles: ['all'],
        options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
      }]
    }]);
  };

  const deleteSection = (sectionIndex) => {
    const newSections = sections.filter((_, i) => i !== sectionIndex);
    setSections(newSections);
  };

  const handleSectionChange = (sectionIndex, field, value) => {
    const newSections = [...sections];
    newSections[sectionIndex][field] = field === 'weight' ? parseFloat(value) || 0 : value;
    setSections(newSections);
  };

  const addCriterion = (sectionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].criteria.push({
      name: '',
      applicableRoles: ['all'],
      options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
    });
    setSections(newSections);
  };

  const deleteCriterion = (sectionIndex, criterionIndex) => {
    const newSections = [...sections];
    newSections[sectionIndex].criteria.splice(criterionIndex, 1);
    setSections(newSections);
  };

  const handleCriterionNameChange = (sectionIndex, criterionIndex, name) => {
    const newSections = [...sections];
    newSections[sectionIndex].criteria[criterionIndex].name = name;
    setSections(newSections);
  };

  const handleRoleToggle = (sectionIndex, criterionIndex, role) => {
    const newSections = [...sections];
    const criterion = newSections[sectionIndex].criteria[criterionIndex];
    
    if (criterion.applicableRoles.includes(role)) {
      criterion.applicableRoles = criterion.applicableRoles.filter(r => r !== role);
    } else {
      criterion.applicableRoles.push(role);
    }
    
    // Ensure at least one role is selected
    if (criterion.applicableRoles.length === 0) {
      criterion.applicableRoles = ['all'];
    }
    
    setSections(newSections);
  };

  const handleOptionDescriptionChange = (sectionIndex, criterionIndex, optionIndex, description) => {
    const newSections = [...sections];
    newSections[sectionIndex].criteria[criterionIndex].options[optionIndex].description = description;
    setSections(newSections);
  };

  const getSectionWeightTotal = () => {
    return sections.reduce((sum, section) => sum + section.weight, 0);
  };

  const handleSave = () => {
    setError('');

    // Validation
    const totalWeight = getSectionWeightTotal();
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(t('sectionWeightsMustTotal100'));
      return;
    }

    // Check for empty names
    for (const section of sections) {
      if (!section.name.trim()) {
        setError(t('allSectionNamesRequired'));
        return;
      }
      for (const criterion of section.criteria) {
        if (!criterion.name.trim()) {
          setError(t('allCriteriaNamesRequired'));
          return;
        }
      }
    }

    onSave({ projectId, phase, sections });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('observationCardBuilderTitle')} - {t(PHASE_NAMES[phase])}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {phase === 'group' 
              ? t('groupObservationCardDesc')
              : t('individualOralObservationCardDesc')}
          </Typography>
        </Box>
        <Chip 
          label={phase === 'group' ? t('phaseOne') : t('phaseTwo')}
          color={phase === 'group' ? 'primary' : 'secondary'}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>{t('importantNote')}:</strong> {t('sectionWeightsMustEqual100')}
        {phase === 'individual_oral' && (
          <Box sx={{ mt: 1 }}>
            {t('individualRoleAssignmentHint')}
          </Box>
        )}
      </Alert>

      {/* Section Weight Summary */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('sectionWeightsTotal')}
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ color: Math.abs(getSectionWeightTotal() - 100) < 0.01 ? 'success.main' : 'error.main' }}
        >
          {getSectionWeightTotal().toFixed(2)}% / 100%
        </Typography>
      </Box>

      {/* Sections */}
      {sections.map((section, sectionIndex) => (
        <Accordion key={sectionIndex} defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                {section.name || t('sectionWithNumber', { number: sectionIndex + 1 })}
              </Typography>
              <Chip label={`${section.weight}%`} size="small" color="primary" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label={t('sectionName')}
                  value={section.name}
                  onChange={(e) => handleSectionChange(sectionIndex, 'name', e.target.value)}
                  placeholder={t('sectionNamePlaceholder')}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label={t('weight')}
                  type="number"
                  value={section.weight}
                  onChange={(e) => handleSectionChange(sectionIndex, 'weight', e.target.value)}
                  InputProps={{ endAdornment: '%' }}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <IconButton 
                  color="error" 
                  onClick={() => deleteSection(sectionIndex)}
                  disabled={sections.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              {t('criteria')}
            </Typography>

            {/* Criteria */}
            {section.criteria.map((criterion, criterionIndex) => (
              <Paper key={criterionIndex} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TextField
                        fullWidth
                        label={`${t('criterion')} ${criterionIndex + 1}`}
                        value={criterion.name}
                        onChange={(e) => handleCriterionNameChange(sectionIndex, criterionIndex, e.target.value)}
                        placeholder={t('criterionNamePlaceholder')}
                      />
                      <IconButton
                        color="error"
                        onClick={() => deleteCriterion(sectionIndex, criterionIndex)}
                        disabled={section.criteria.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Grid>

                  {/* Role Selection (Individual/Oral phase only) */}
                  {phase === 'individual_oral' && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('rolesApplicableToCriterion')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {ROLES.map(role => (
                          <Chip
                            key={role.value}
                            label={
                              role.value === 'all'
                                ? t('allRoles')
                                : role.value === 'system_designer'
                                  ? t('roleSystemDesigner')
                                  : role.value === 'hardware_engineer'
                                    ? t('roleHardwareEngineer')
                                    : t('roleProgrammer')
                            }
                            onClick={() => handleRoleToggle(sectionIndex, criterionIndex, role.value)}
                            color={criterion.applicableRoles.includes(role.value) ? 'primary' : 'default'}
                            variant={criterion.applicableRoles.includes(role.value) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}

                  {/* Options */}
                  <Grid item xs={12}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      {t('evaluationOptions')}
                    </Typography>
                    {criterion.options.map((option, optionIndex) => (
                      <Box key={optionIndex} sx={{ mb: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label={`${option.percentage}%`}
                          value={option.description}
                          onChange={(e) => handleOptionDescriptionChange(sectionIndex, criterionIndex, optionIndex, e.target.value)}
                          placeholder={t('descriptionForPercentage', { percentage: option.percentage })}
                        />
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={() => addCriterion(sectionIndex)}
              variant="outlined"
              size="small"
            >
              {t('addCriterion')}
            </Button>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          startIcon={<AddIcon />}
          onClick={addSection}
          variant="outlined"
          color="primary"
        >
          {t('addNewSection')}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          size="large"
        >
          {t('saveObservationCard')}
        </Button>
      </Box>
    </Paper>
  );
};

export default ObservationCardBuilder;

