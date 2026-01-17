import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { submitPreTest, getPreTestQuestions } from '../redux/slices/preTestSlice';
import { setPreTestCompleted } from '../redux/slices/authSlice';

const LIKERT_OPTIONS = [
  { value: 1, label: 'لا أوافق بشدة' },
  { value: 2, label: 'لا أوافق' },
  { value: 3, label: 'محايد' },
  { value: 4, label: 'أوافق' },
  { value: 5, label: 'أوافق بشدة' }
];

const SECTIONS = [
  { key: 'technicalReadiness', title: 'الجاهزية التقنية الرقمية', icon: '💻' },
  { key: 'programmingReadiness', title: 'الجاهزية البرمجية', icon: '👨‍💻' },
  { key: 'arduinoReadiness', title: 'الجاهزية لاستخدام Arduino', icon: '🔧' },
  { key: 'smartSystemsReadiness', title: 'الجاهزية للأنظمة الذكية', icon: '🤖' },
  { key: 'projectLearningReadiness', title: 'الجاهزية للتعلم بالمشاريع', icon: '📚' }
];

const PreTestPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { questions, loading, error } = useSelector((state) => state.preTest);

  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Redirect non-students
    if (user && user.role !== 'student') {
      navigate('/dashboard');
      return;
    }

    // Redirect if already completed
    if (user && user.preTestCompleted) {
      navigate('/dashboard');
      return;
    }

    // Fetch questions
    dispatch(getPreTestQuestions());
  }, [dispatch, navigate, user]);

  const currentSection = SECTIONS[activeStep];
  const currentQuestions = questions[currentSection?.key] || [];

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const isCurrentSectionComplete = () => {
    return currentQuestions.every(q => answers[q.id] !== undefined);
  };

  const handleNext = () => {
    if (activeStep < SECTIONS.length - 1) {
      setActiveStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setSubmitError('');

    try {
      const result = await dispatch(submitPreTest(answers)).unwrap();
      // Update user state to mark pretest as completed
      dispatch(setPreTestCompleted());
      // Navigate to results page with the data
      navigate('/pretest-result', { state: { result } });
    } catch (err) {
      setSubmitError(err.message || 'حدث خطأ في إرسال الاختبار');
    } finally {
      setSubmitLoading(false);
    }
  };

  const progressPercentage = ((activeStep + 1) / SECTIONS.length) * 100;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            اختبار الجاهزية للمنصة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            يهدف هذا الاختبار لقياس جاهزيتك قبل البدء في استخدام المنصة
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            الاختبار غير مُقيّم ويُستخدم فقط لتحديد مستوى الجاهزية
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              التقدم
            </Typography>
            <Typography variant="body2" color="primary" fontWeight="bold">
              {Math.round(progressPercentage)}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 8, borderRadius: 4 }} />
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {SECTIONS.map((section, index) => (
            <Step key={section.key}>
              <StepLabel>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  {section.icon} {section.title}
                </Box>
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {section.icon}
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Current Section */}
        <Box mb={4}>
          <Typography variant="h5" fontWeight="bold" gutterBottom textAlign="center" mb={3}>
            {currentSection?.icon} {currentSection?.title}
          </Typography>

          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {/* Questions */}
          {currentQuestions.map((question, index) => (
            <Paper key={question.id} variant="outlined" sx={{ p: 3, mb: 3 }}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 500 }}>
                  {index + 1}. {question.question}
                </FormLabel>

                {question.type === 'likert' ? (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    {LIKERT_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value.toString()}
                        control={<Radio />}
                        label={option.label}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </RadioGroup>
                ) : (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    {question.options.map((option, optIndex) => (
                      <FormControlLabel
                        key={optIndex}
                        value={optIndex.toString()}
                        control={<Radio />}
                        label={option}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </RadioGroup>
                )}
              </FormControl>
            </Paper>
          ))}
        </Box>

        {/* Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" gap={2}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            السابق
          </Button>

          {activeStep === SECTIONS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isCurrentSectionComplete() || submitLoading}
            >
              {submitLoading ? <CircularProgress size={24} /> : 'إرسال الاختبار'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!isCurrentSectionComplete()}
            >
              التالي
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default PreTestPage;
