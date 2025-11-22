import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../redux/slices/authSlice';
import api from '../services/api';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error } = useSelector((state) => state.auth);

  const [invitationToken, setInvitationToken] = useState('');
  const [invitationData, setInvitationData] = useState(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validationError, setValidationError] = useState('');

  // Check invitation token on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setInvitationError('رمز الدعوة مطلوب. يرجى استخدام الرابط المرسل إليك');
      setCheckingInvitation(false);
      return;
    }

    setInvitationToken(token);
    checkInvitation(token);
  }, [searchParams]);

  const checkInvitation = async (token) => {
    try {
      const response = await api.get(`/auth/invitation/${token}`);
      setInvitationData(response.data.data);
      setFormData(prev => ({ ...prev, email: response.data.data.email }));
      setCheckingInvitation(false);
    } catch (err) {
      setInvitationError(err.response?.data?.message || 'رمز الدعوة غير صالح');
      setCheckingInvitation(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setValidationError('كلمات المرور غير متطابقة');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setValidationError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    const result = await dispatch(register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      token: invitationToken,
    }));

    if (result.type === 'auth/register/fulfilled') {
      navigate('/dashboard');
    }
  };

  if (checkingInvitation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (invitationError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%' }}>
          <Alert severity="error">{invitationError}</Alert>
          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            للحصول على دعوة، يرجى التواصل مع المدير
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight={700}>
          إنشاء حساب جديد
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
          املأ البيانات التالية للانضمام إلى المنصة
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          البريد: {invitationData?.email} | الدور: {invitationData?.role === 'student' ? 'طالب' : 'معلم'}
        </Alert>

        {(error || validationError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationError || error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="الاسم الكامل"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            name="email"
            type="email"
            value={formData.email}
            disabled
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="كلمة المرور"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="تأكيد كلمة المرور"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
