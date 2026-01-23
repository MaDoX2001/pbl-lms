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
  Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const PERCENTAGE_OPTIONS = [0, 20, 40, 60, 80, 100];

const ASSESSMENT_PART_NAMES = {
  project_evaluation: 'تقييم المشروع (بناءً على التقرير)',
  individual_evaluation: 'التقييم الفردي',
  oral_evaluation: 'التقييم الشفوي'
};

const ObservationCardBuilder = ({ projectId, initialData, onSave }) => {
  const [assessmentParts, setAssessmentParts] = useState([
    {
      name: 'project_evaluation',
      displayName: ASSESSMENT_PART_NAMES.project_evaluation,
      weight: 33.33,
      sections: [{
        name: '',
        weight: 100,
        criteria: [{
          name: '',
          options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
        }]
      }]
    },
    {
      name: 'individual_evaluation',
      displayName: ASSESSMENT_PART_NAMES.individual_evaluation,
      weight: 33.33,
      sections: [{
        name: '',
        weight: 100,
        criteria: [{
          name: '',
          options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
        }]
      }]
    },
    {
      name: 'oral_evaluation',
      displayName: ASSESSMENT_PART_NAMES.oral_evaluation,
      weight: 33.34,
      sections: [{
        name: '',
        weight: 100,
        criteria: [{
          name: '',
          options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
        }]
      }]
    }
  ]);

  useEffect(() => {
    if (initialData && initialData.assessmentParts) {
      setAssessmentParts(initialData.assessmentParts);
    }
  }, [initialData]);

  const handlePartWeightChange = (partIndex, weight) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].weight = parseFloat(weight) || 0;
    setAssessmentParts(newParts);
  };

  const addSection = (partIndex) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections.push({
      name: '',
      weight: 0,
      criteria: [{
        name: '',
        options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
      }]
    });
    setAssessmentParts(newParts);
  };

  const deleteSection = (partIndex, sectionIndex) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections.splice(sectionIndex, 1);
    setAssessmentParts(newParts);
  };

  const handleSectionChange = (partIndex, sectionIndex, field, value) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections[sectionIndex][field] = field === 'weight' ? parseFloat(value) || 0 : value;
    setAssessmentParts(newParts);
  };

  const addCriterion = (partIndex, sectionIndex) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections[sectionIndex].criteria.push({
      name: '',
      options: PERCENTAGE_OPTIONS.map(p => ({ percentage: p, description: '' }))
    });
    setAssessmentParts(newParts);
  };

  const deleteCriterion = (partIndex, sectionIndex, criterionIndex) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections[sectionIndex].criteria.splice(criterionIndex, 1);
    setAssessmentParts(newParts);
  };

  const handleCriterionNameChange = (partIndex, sectionIndex, criterionIndex, name) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections[sectionIndex].criteria[criterionIndex].name = name;
    setAssessmentParts(newParts);
  };

  const handleOptionDescriptionChange = (partIndex, sectionIndex, criterionIndex, optionIndex, description) => {
    const newParts = [...assessmentParts];
    newParts[partIndex].sections[sectionIndex].criteria[criterionIndex].options[optionIndex].description = description;
    setAssessmentParts(newParts);
  };

  const getTotalPartWeight = () => {
    return assessmentParts.reduce((sum, part) => sum + part.weight, 0);
  };

  const getSectionWeightTotal = (partIndex) => {
    return assessmentParts[partIndex].sections.reduce((sum, section) => sum + section.weight, 0);
  };

  const handleSave = () => {
    // Validation
    const totalWeight = getTotalPartWeight();
    if (Math.abs(totalWeight - 100) > 0.01) {
      alert('يجب أن يكون مجموع أوزان أجزاء التقييم 100%');
      return;
    }

    for (let i = 0; i < assessmentParts.length; i++) {
      const sectionTotal = getSectionWeightTotal(i);
      if (Math.abs(sectionTotal - 100) > 0.01) {
        alert(`يجب أن يكون مجموع أوزان الأقسام في ${assessmentParts[i].displayName} يساوي 100%`);
        return;
      }
    }

    onSave({ projectId, assessmentParts });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        بطاقة الملاحظة (Observation Card)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        قم ببناء نظام التقييم للمشروع. يتكون التقييم من 3 أجزاء رئيسية، كل جزء يحتوي على أقسام ومعايير.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>ملاحظة:</strong> يجب أن يكون مجموع أوزان أجزاء التقييم الثلاثة = 100%، ومجموع أوزان الأقسام داخل كل جزء = 100%
      </Alert>

      {/* Part Weights Summary */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          توزيع أوزان أجزاء التقييم:
        </Typography>
        <Grid container spacing={2}>
          {assessmentParts.map((part, index) => (
            <Grid item xs={12} sm={4} key={part.name}>
              <TextField
                fullWidth
                label={part.displayName}
                type="number"
                value={part.weight}
                onChange={(e) => handlePartWeightChange(index, e.target.value)}
                InputProps={{ endAdornment: '%' }}
                size="small"
              />
            </Grid>
          ))}
        </Grid>
        <Typography 
          variant="body2" 
          sx={{ mt: 1, color: Math.abs(getTotalPartWeight() - 100) < 0.01 ? 'success.main' : 'error.main' }}
        >
          المجموع: {getTotalPartWeight().toFixed(2)}%
        </Typography>
      </Box>

      {/* Assessment Parts */}
      {assessmentParts.map((part, partIndex) => (
        <Accordion key={part.name} defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>
              {part.displayName} ({part.weight}%)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {/* Section Weight Summary */}
            <Alert 
              severity={Math.abs(getSectionWeightTotal(partIndex) - 100) < 0.01 ? 'success' : 'warning'}
              sx={{ mb: 2 }}
            >
              مجموع أوزان الأقسام: {getSectionWeightTotal(partIndex).toFixed(2)}% / 100%
            </Alert>

            {/* Sections */}
            {part.sections.map((section, sectionIndex) => (
              <Paper key={sectionIndex} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    القسم {sectionIndex + 1}
                  </Typography>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => deleteSection(partIndex, sectionIndex)}
                    disabled={part.sections.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="اسم القسم"
                      value={section.name}
                      onChange={(e) => handleSectionChange(partIndex, sectionIndex, 'name', e.target.value)}
                      placeholder="مثال: جودة التقرير"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="الوزن"
                      type="number"
                      value={section.weight}
                      onChange={(e) => handleSectionChange(partIndex, sectionIndex, 'weight', e.target.value)}
                      InputProps={{ endAdornment: '%' }}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Criteria */}
                <Typography variant="subtitle2" gutterBottom>
                  المعايير:
                </Typography>
                {section.criteria.map((criterion, criterionIndex) => (
                  <Box key={criterionIndex} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <TextField
                        fullWidth
                        label={`المعيار ${criterionIndex + 1}`}
                        value={criterion.name}
                        onChange={(e) => handleCriterionNameChange(partIndex, sectionIndex, criterionIndex, e.target.value)}
                        placeholder="مثال: وضوح الأهداف"
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => deleteCriterion(partIndex, sectionIndex, criterionIndex)}
                        disabled={section.criteria.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    {/* Option Descriptions */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      أوصاف الخيارات (0%, 20%, 40%, 60%, 80%, 100%):
                    </Typography>
                    <Grid container spacing={1}>
                      {criterion.options.map((option, optionIndex) => (
                        <Grid item xs={12} sm={6} key={optionIndex}>
                          <TextField
                            fullWidth
                            label={`${option.percentage}%`}
                            value={option.description}
                            onChange={(e) => handleOptionDescriptionChange(partIndex, sectionIndex, criterionIndex, optionIndex, e.target.value)}
                            placeholder={`وصف للدرجة ${option.percentage}%`}
                            size="small"
                            multiline
                            rows={2}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addCriterion(partIndex, sectionIndex)}
                  size="small"
                  variant="outlined"
                >
                  إضافة معيار
                </Button>
              </Paper>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={() => addSection(partIndex)}
              variant="contained"
              size="small"
            >
              إضافة قسم جديد
            </Button>
          </AccordionDetails>
        </Accordion>
      ))}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSave}
        >
          حفظ بطاقة الملاحظة
        </Button>
      </Box>
    </Paper>
  );
};

export default ObservationCardBuilder;
