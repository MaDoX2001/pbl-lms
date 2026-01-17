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

  const dimensions = [
    'Technical Readiness',
    'Programming Readiness',
    'Arduino Readiness',
    'Smart Systems Readiness',
    'Project Learning Readiness',
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
    if (!questions[activeStep]) return false;
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

      // CRITICAL: Replace auth.user with the updated user from backend
      // This ensures single source of truth
      dispatch({ type: 'auth/updateUser', payload: response.data.user });

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assessment');
      setSubmitting(false);
    }
  };

  // Calculate progress
  const totalQuestions = questions.reduce(
    (sum, dim) => sum + dim.questions.length,
    0
  );
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

  const currentDimension = questions[activeStep];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Pre-Assessment Test
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          This diagnostic test helps us understand your current skills and knowledge.
          Please answer all questions honestly.
        </Typography>

        {/* Overall Progress */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Overall Progress: {answeredQuestions} / {totalQuestions} questions
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
              Question {activeStep * 4 + 1} - {activeStep * 4 + 4} of {totalQuestions}
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
            Back
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
              'Submit'
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PreAssessmentPage;
