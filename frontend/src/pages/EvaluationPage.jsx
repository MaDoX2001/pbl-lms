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
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  FormControl,
  FormLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { toast } from 'react-toastify';
import { assessmentAPI } from '../services/api';
import api from '../services/api';

const EvaluationPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [observationCard, setObservationCard] = useState(null);
  const [selections, setSelections] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(null);

  useEffect(() => {
    fetchData();
  }, [submissionId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch submission details
      const subRes = await api.get(`/submission/${submissionId}`);
      setSubmission(subRes.data.data);

      // Fetch observation card for the project
      const cardRes = await assessmentAPI.getObservationCard(subRes.data.data.assignment.projectId._id);
      setObservationCard(cardRes.data.data);

      // Initialize selections structure
      initializeSelections(cardRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const initializeSelections = (card) => {
    const initialSelections = {};
    card.assessmentParts.forEach(part => {
      initialSelections[part.name] = {};
      part.sections.forEach(section => {
        initialSelections[part.name][section.name] = {};
        section.criteria.forEach(criterion => {
          initialSelections[part.name][section.name][criterion.name] = null;
        });
      });
    });
    setSelections(initialSelections);
  };

  const handleSelectionChange = (partName, sectionName, criterionName, percentage, description) => {
    setSelections(prev => ({
      ...prev,
      [partName]: {
        ...prev[partName],
        [sectionName]: {
          ...prev[sectionName],
          [criterionName]: { percentage, description }
        }
      }
    }));
  };

  const calculatePreviewScore = () => {
    if (!observationCard || !selections) return null;

    let finalScore = 0;

    observationCard.assessmentParts.forEach(part => {
      let partScore = 0;

      part.sections.forEach(section => {
        const criteriaCount = section.criteria.length;
        if (criteriaCount === 0) return;

        let sectionSum = 0;
        let selectionCount = 0;

        section.criteria.forEach(criterion => {
          const selection = selections[part.name]?.[section.name]?.[criterion.name];
          if (selection && selection.percentage !== null) {
            sectionSum += selection.percentage;
            selectionCount++;
          }
        });

        if (selectionCount > 0) {
          const avgPercentage = sectionSum / criteriaCount;
          const sectionScore = avgPercentage * (section.weight / 100);
          partScore += sectionScore;
        }
      });

      finalScore += partScore * (part.weight / 100);
    });

    return finalScore.toFixed(2);
  };

  const validateSelections = () => {
    for (const part of observationCard.assessmentParts) {
      for (const section of part.sections) {
        for (const criterion of section.criteria) {
          const selection = selections[part.name]?.[section.name]?.[criterion.name];
          if (!selection || selection.percentage === null) {
            return { valid: false, message: `يجب اختيار قيمة للمعيار: ${criterion.name}` };
          }
        }
      }
    }
    return { valid: true };
  };

  const handleSubmit = async () => {
    // Validate all selections are made
    const validation = validateSelections();
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      setSubmitting(true);

      // Build assessment part evaluations
      const assessmentPartEvaluations = observationCard.assessmentParts.map(part => ({
        partName: part.name,
        sectionEvaluations: part.sections.map(section => ({
          sectionName: section.name,
          criterionSelections: section.criteria.map(criterion => ({
            criterionName: criterion.name,
            selectedPercentage: selections[part.name][section.name][criterion.name].percentage,
            selectedDescription: selections[part.name][section.name][criterion.name].description
          }))
        }))
      }));

      const evaluationData = {
        submissionId,
        assessmentPartEvaluations,
        feedbackSummary,
        retryAllowed
      };

      await assessmentAPI.createEvaluation(evaluationData);
      toast.success('تم حفظ التقييم بنجاح');
      navigate(-1); // Go back to submissions page
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error(error.response?.data?.message || 'فشل حفظ التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (observationCard && selections) {
      const score = calculatePreviewScore();
      setCalculatedScore(score);
    }
  }, [selections, observationCard]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!observationCard) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          لا توجد بطاقة ملاحظة لهذا المشروع. يرجى إنشاء بطاقة ملاحظة أولاً.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        تقييم التسليم
      </Typography>

      {/* Submission Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          معلومات التسليم
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">الطالب:</Typography>
            <Typography variant="body1">{submission?.student?.name}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">المشروع:</Typography>
            <Typography variant="body1">{submission?.assignment?.projectId?.title}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">تاريخ التسليم:</Typography>
            <Typography variant="body1">{new Date(submission?.submittedAt).toLocaleDateString('ar-EG')}</Typography>
          </Box>
        </Box>
        {submission?.fileUrl && (
          <Button
            variant="outlined"
            href={submission.fileUrl}
            target="_blank"
            sx={{ mt: 2 }}
          >
            عرض الملف المرفوع
          </Button>
        )}
      </Paper>

      {/* Calculated Score Preview */}
      {calculatedScore !== null && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: calculatedScore >= 60 ? 'success.light' : 'error.light' }}>
          <Typography variant="h5" fontWeight={600} textAlign="center">
            الدرجة المحسوبة: {calculatedScore}% 
            <Chip 
              label={calculatedScore >= 60 ? 'ناجح' : 'راسب'} 
              color={calculatedScore >= 60 ? 'success' : 'error'}
              sx={{ ml: 2 }}
            />
          </Typography>
        </Paper>
      )}

      {/* Observation Card Evaluation */}
      {observationCard.assessmentParts.map((part, partIndex) => (
        <Accordion key={part.name} defaultExpanded={partIndex === 0} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" fontWeight={600}>
              {part.displayName} ({part.weight}%)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {part.sections.map((section) => (
              <Paper key={section.name} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {section.name} ({section.weight}%)
                </Typography>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>المعيار</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">0%</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">20%</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">40%</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">60%</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">80%</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">100%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {section.criteria.map((criterion) => (
                        <TableRow key={criterion.name}>
                          <TableCell sx={{ fontWeight: 500 }}>{criterion.name}</TableCell>
                          {criterion.options.map((option) => (
                            <TableCell key={option.percentage} align="center">
                              <FormControlLabel
                                value={option.percentage}
                                control={
                                  <Radio
                                    checked={
                                      selections[part.name]?.[section.name]?.[criterion.name]?.percentage === option.percentage
                                    }
                                    onChange={() =>
                                      handleSelectionChange(
                                        part.name,
                                        section.name,
                                        criterion.name,
                                        option.percentage,
                                        option.description
                                      )
                                    }
                                  />
                                }
                                label=""
                                sx={{ m: 0 }}
                              />
                              {option.description && (
                                <Typography variant="caption" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                                  {option.description}
                                </Typography>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Feedback and Actions */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <TextField
          fullWidth
          label="ملخص التغذية الراجعة (اختياري)"
          multiline
          rows={4}
          value={feedbackSummary}
          onChange={(e) => setFeedbackSummary(e.target.value)}
          placeholder="اكتب ملاحظات عامة للطالب..."
        />

        {calculatedScore !== null && calculatedScore < 60 && (
          <FormControl sx={{ mt: 2 }}>
            <FormLabel>هل تسمح بإعادة المحاولة؟</FormLabel>
            <RadioGroup
              row
              value={retryAllowed}
              onChange={(e) => setRetryAllowed(e.target.value === 'true')}
            >
              <FormControlLabel value={true} control={<Radio />} label="نعم" />
              <FormControlLabel value={false} control={<Radio />} label="لا" />
            </RadioGroup>
          </FormControl>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ التقييم'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default EvaluationPage;
