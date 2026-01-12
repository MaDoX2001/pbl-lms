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

function ForgotPasswordPage() {
  const navigate = useNavigate();
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

  const steps = ['إدخال البريد الإلكتروني', 'إدخال رمز التحقق', 'كلمة المرور الجديدة'];

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
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/forgot-password', { email: formData.email });
      setSuccess('تم إرسال رمز إعادة التعيين إلى بريدك الإلكتروني');
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.otp) {
      setError('رمز التحقق مطلوب');
      return;
    }

    if (formData.otp.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setActiveStep(2);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/reset-password', {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      setSuccess('تم إعادة تعيين كلمة المرور بنجاح!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إعادة تعيين كلمة المرور');
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
              نسيت كلمة المرور
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
                  أدخل بريدك الإلكتروني وسنرسل لك رمز إعادة التعيين
                </Typography>
                
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
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
                  {loading ? <CircularProgress size={24} /> : 'إرسال الرمز'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/login')}
                >
                  العودة لتسجيل الدخول
                </Button>
              </Box>
            )}

            {/* Step 2: Verify OTP */}
            {activeStep === 1 && (
              <Box component="form" onSubmit={handleVerifyOTP}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  تم إرسال رمز إعادة التعيين إلى {formData.email}
                </Typography>

                <TextField
                  fullWidth
                  label="رمز التحقق"
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
                  التالي
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={handleRequestOTP}
                  sx={{ mb: 2 }}
                >
                  إعادة إرسال الرمز
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                >
                  رجوع
                </Button>
              </Box>
            )}

            {/* Step 3: Reset Password */}
            {activeStep === 2 && (
              <Box component="form" onSubmit={handleResetPassword}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  أدخل كلمة المرور الجديدة
                </Typography>

                <TextField
                  fullWidth
                  label="كلمة المرور الجديدة"
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
                  label="تأكيد كلمة المرور"
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
                  {loading ? <CircularProgress size={24} /> : 'إعادة تعيين كلمة المرور'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setActiveStep(1)}
                  disabled={loading}
                >
                  رجوع
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
