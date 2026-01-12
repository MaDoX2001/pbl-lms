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
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

function EmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [formData, setFormData] = useState({
    email: email,
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleResendOTP = async () => {
    if (!formData.email) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    setResending(true);
    setError('');
    try {
      await api.post('/email/send-verification-otp', { email: formData.email });
      setSuccess('تم إرسال رمز التفعيل مرة أخرى');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إرسال رمز التفعيل');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.otp) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (formData.otp.length !== 6) {
      setError('رمز التفعيل يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    try {
      await api.post('/email/verify-email', formData);
      setSuccess('تم تفعيل البريد الإلكتروني بنجاح!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل التفعيل');
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
              تفعيل البريد الإلكتروني
            </Typography>
            
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              أدخل رمز التفعيل المرسل إلى بريدك الإلكتروني
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
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

              <TextField
                fullWidth
                label="رمز التفعيل"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
                placeholder="123456"
                inputProps={{ maxLength: 6, pattern: '[0-9]{6}' }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'تفعيل'}
              </Button>

              <Button
                fullWidth
                variant="text"
                size="small"
                onClick={handleResendOTP}
                disabled={resending || !formData.email}
                sx={{ mb: 2 }}
              >
                {resending ? <CircularProgress size={20} /> : 'إعادة إرسال الرمز'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/login')}
              >
                العودة لتسجيل الدخول
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default EmailVerificationPage;
