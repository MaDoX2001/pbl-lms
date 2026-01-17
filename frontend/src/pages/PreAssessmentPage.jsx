import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import api from '../services/api';

/**
 * PreAssessmentPage Component
 * 
 * Multi-step diagnostic test for students with 5 dimensions:
 * 1. Technical Readiness
 * 2. Programming Readiness
 * 3. Arduino Readiness
 * 4. Smart Systems Readiness
 * 5. Project Learning Readiness
 * 
 * Each dimension has 4 questions (20 total)
 * Question types: Likert scale (1-5) and Multiple Choice (correct/incorrect)
 */
const PreAssessmentPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [activeStep, setActiveStep] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const dimensions = [
    'الجاهزية التقنية',
    'الجاهزية البرمجية',
    'الجاهزية لاستخدام Arduino',
    'الجاهزية للأنظمة الذكية',
    'الجاهزية للتعلم بالمشاريع',
  ];

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await api.get('/preassessment/questions');
        setQuestions(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load questions');
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Check if current step is complete
  const isStepComplete = () => {
    if (!Array.isArray(questions) || !questions[activeStep]) return false;
    const dimensionQuestions = questions[activeStep].questions;
    return dimensionQuestions.every((q) => answers[q.id] !== undefined);
  };

  // Handle next step
  const handleNext = () => {
    if (activeStep === dimensions.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Submit assessment
  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/preassessment/submit', { answers });

      // Store results to show in dialog
      setResults(response.data);

      // CRITICAL: Replace auth.user with the updated user from backend
      // This ensures single source of truth
      dispatch({ type: 'auth/updateUser', payload: response.data.user });

      // Show results dialog
      setShowResults(true);
      setSubmitting(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
      setSubmitting(false);
    }
  };

  // Handle closing results and navigating to dashboard
  const handleCloseResults = () => {
    setShowResults(false);
    navigate('/dashboard', { replace: true });
  };

  // Calculate progress
  const totalQuestions = Array.isArray(questions) 
    ? questions.reduce((sum, dim) => sum + dim.questions.length, 0)
    : 0;
  const answeredQuestions = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !questions.length) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const currentDimension = Array.isArray(questions) ? questions[activeStep] : null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          اختبار تشخيصي
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          يساعدنا هذا الاختبار في فهم مستواك الحالي ومهاراتك. الرجاء الإجابة على جميع الأسئلة بصدق.
        </Typography>

        {/* Overall Progress */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            التقدم الإجمالي: {answeredQuestions} / {totalQuestions} سؤال
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {dimensions.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Questions for Current Dimension */}
        {currentDimension && (
          <Box>
            <Typography variant="h5" gutterBottom>
              {currentDimension.dimension}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              السؤال {activeStep * 4 + 1} - {activeStep * 4 + 4} من {totalQuestions}
            </Typography>

            {currentDimension.questions.map((question, index) => (
              <FormControl
                key={question.id}
                component="fieldset"
                sx={{ mb: 4, width: '100%' }}
              >
                <FormLabel component="legend">
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {activeStep * 4 + index + 1}. {question.question}
                  </Typography>
                </FormLabel>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                >
                  {question.options.map((option, optIndex) => (
                    <FormControlLabel
                      key={optIndex}
                      value={option}
                      control={<Radio />}
                      label={option}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            ))}
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || submitting}
            variant="outlined"
          >
            رجوع
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepComplete() || submitting}
            variant="contained"
            color="primary"
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : activeStep === dimensions.length - 1 ? (
              'إرسال'
            ) : (
              'التالي'
            )}
          </Button>
        </Box>
      </Paper>

      {/* Results Dialog */}
      <Dialog 
        open={showResults} 
        onClose={handleCloseResults}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h4" align="center" sx={{ fontWeight: 'bold' }}>
            نتيجة الاختبار التشخيصي
          </Typography>
        </DialogTitle>
        <DialogContent>
          {results && (
            <Box sx={{ py: 2 }}>
              {/* Overall Score */}
              <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="h5" align="center" gutterBottom>
                  النتيجة الإجمالية
                </Typography>
                <Typography variant="h2" align="center" sx={{ fontWeight: 'bold' }}>
                  {results.totalScore ? results.totalScore.toFixed(1) : 0}%
                </Typography>
                <Typography variant="h6" align="center" sx={{ mt: 1 }}>
                  مستوى الجاهزية: {
                    results.readinessLevel === 'high' ? 'عالي 🎉' :
                    results.readinessLevel === 'medium' ? 'متوسط 👍' :
                    'يحتاج تحسين 💪'
                  }
                </Typography>
              </Paper>

              {/* Dimension Scores */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                النتائج التفصيلية لكل بُعد:
              </Typography>
              <Grid container spacing={2}>
                {results.dimensionScores && Object.entries(results.dimensionScores).map(([key, score], index) => {
                  const dimensionNames = {
                    technicalReadiness: 'الجاهزية التقنية',
                    programmingReadiness: 'الجاهزية البرمجية',
                    arduinoReadiness: 'الجاهزية لاستخدام Arduino',
                    smartSystemsReadiness: 'الجاهزية للأنظمة الذكية',
                    projectLearningReadiness: 'الجاهزية للتعلم بالمشاريع'
                  };
                  
                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {dimensionNames[key]}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={score} 
                                sx={{ height: 10, borderRadius: 5 }}
                                color={score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'}
                              />
                            </Box>
                            <Typography variant="body2" sx={{ minWidth: 50, fontWeight: 'bold' }}>
                              {score.toFixed(0)}%
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  ستساعدنا هذه النتائج في تقديم تجربة تعليمية مخصصة لك. يمكنك البدء في استكشاف المشاريع الآن! 🚀
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleCloseResults} 
            variant="contained" 
            color="primary" 
            size="large"
            fullWidth
          >
            الانتقال إلى لوحة التحكم
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PreAssessmentPage;
