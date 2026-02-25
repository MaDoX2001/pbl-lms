import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = [t('stepEmail'), t('stepOtp'), t('stepNewPassword')];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email) {
      setError(t('emailRequired'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/forgot-password', { email: formData.email });
      setSuccess(t('resetCodeSentSuccess'));
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.message || t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.otp) {
      setError(t('otpRequired'));
      return;
    }

    if (formData.otp.length !== 6) {
      setError(t('otp6Digits'));
      return;
    }

    setActiveStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.newPassword || !formData.confirmPassword) {
      setError(t('allFieldsRequired'));
      return;
    }

    if (formData.newPassword.length < 8) {
      setError(t('passwordMin8'));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('passwordsMismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/reset-password', {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      setSuccess(t('resetPasswordSuccess'));
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight={700}>
              {t('forgotTitle')}
            </Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Step 1: Request OTP */}
            {activeStep === 0 && (
              <Box component="form" onSubmit={handleRequestOTP}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('enterEmailReset')}
                </Typography>
                
                <TextField
                  fullWidth
                  label={t('email')}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : t('sendCode')}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/login')}
                >
                  {t('backToLogin')}
                </Button>
              </Box>
            )}

            {/* Step 2: Verify OTP */}
            {activeStep === 1 && (
              <Box component="form" onSubmit={handleVerifyOTP}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('codeSentTo', { email: formData.email })}
                </Typography>

                <TextField
                  fullWidth
                  label={t('verificationCode')}
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  margin="normal"
                  required
                  placeholder="123456"
                  inputProps={{ maxLength: 6, pattern: '[0-9]{6}' }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                >
                  {t('next')}
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={handleRequestOTP}
                  sx={{ mb: 2 }}
                >
                  {t('resendCode')}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                >
                  {t('back')}
                </Button>
              </Box>
            )}

            {/* Step 3: Reset Password */}
            {activeStep === 2 && (
              <Box component="form" onSubmit={handleResetPassword}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('enterNewPassword')}
                </Typography>

                <TextField
                  fullWidth
                  label={t('newPassword')}
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label={t('confirmPassword')}
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  margin="normal"
                  required
                  disabled={loading}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : t('resetPassword')}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                  disabled={loading}
                >
                  {t('back')}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default ForgotPasswordPage;
