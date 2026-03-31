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
  StepLabel,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';
import { toast } from 'react-toastify';

function ResetTOTPPage() {
  const navigate = useNavigate();
  const { t, direction } = useAppSettings();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const steps = [t('stepEmail') || 'البريد الإلكتروني', t('stepOtp') || 'التحقق من الرمز'];

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
      await api.post('/email/request-totp-reset', { email: formData.email });
      setSuccess('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
      setActiveStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في إرسال الرمز');
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.otp) {
      setError('رمز التحقق مطلوب');
      return;
    }

    if (formData.otp.length !== 6) {
      setError('الرمز يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/reset-totp', {
        email: formData.email,
        otp: formData.otp
      });
      setSuccess('تم إعادة تعيين المصادقة الثنائية بنجاح!');
      toast.success('تم إعادة تعيين المصادقة الثنائية');
      
      setTimeout(() => {
        navigate('/login', { state: { message: 'تم إعادة تعيين المصادقة الثنائية. يرجى تسجيل الدخول مجدداً' } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إعادة تعيين المصادقة الثنائية');
      toast.error(err.response?.data?.message || 'خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom 
              align="center" 
              fontWeight={700}
              sx={{ mb: 1 }}
            >
              إعادة تعيين المصادقة الثنائية
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center"
              sx={{ mb: 3 }}
            >
              هل نسيت كلمة مرور تطبيق المصادقة؟ لا تقلق! استعد أغلاق الجديد من خلال رمز التحقق
            </Typography>

            <Stepper 
              activeStep={activeStep} 
              sx={{ mb: 4 }}
              orientation={direction === 'rtl' ? 'vertical' : 'horizontal'}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {/* Step 1: Enter Email */}
            {activeStep === 0 && (
              <Box component="form" onSubmit={handleRequestOTP}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  أدخل البريد الإلكتروني المرتبط بحسابك
                </Typography>
                
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'إرسال رمز التحقق'}
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" align="center">
                  تذكرت كلمة المرور؟{' '}
                  <Button 
                    color="primary" 
                    onClick={() => navigate('/login')}
                    variant="text"
                    size="small"
                  >
                    عودة للدخول
                  </Button>
                </Typography>
              </Box>
            )}

            {/* Step 2: Enter OTP */}
            {activeStep === 1 && (
              <Box component="form" onSubmit={handleResetTOTP}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  أدخل رمز التحقق المرسل إلى بريدك الإلكتروني
                </Typography>
                
                <TextField
                  fullWidth
                  label="رمز التحقق"
                  name="otp"
                  type="text"
                  inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                  value={formData.otp}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="000000"
                  sx={{ mb: 3 }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'إعادة تعيين المصادقة'}
                  </Button>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setActiveStep(0)}
                    disabled={loading}
                  >
                    رجوع
                  </Button>
                </Box>

                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  align="center"
                  sx={{ mt: 2, display: 'block' }}
                >
                  الرمز صالح لمدة 10 دقائق فقط
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default ResetTOTPPage;
