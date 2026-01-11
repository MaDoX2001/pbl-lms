import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';

const PublicRegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/public-register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('تم إرسال طلب التسجيل بنجاح!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء التسجيل');
      toast.error(err.response?.data?.message || 'فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '70vh',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              تم إرسال طلبك بنجاح! ✅
            </Typography>
            <Typography variant="body2">
              تم إنشاء حسابك وإرسال طلب الموافقة للمشرف. سيتم إعلامك عند الموافقة على حسابك.
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              جاري التوجيه لصفحة تسجيل الدخول...
            </Typography>
          </Alert>
          <Button
            fullWidth
            variant="outlined"
            component={RouterLink}
            to="/login"
          >
            العودة لتسجيل الدخول
          </Button>
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
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight={700}>
          إنشاء حساب جديد
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          أنشئ حسابك وانتظر موافقة المشرف
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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
            onChange={handleChange}
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
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            لديك حساب بالفعل؟{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              تسجيل الدخول
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default PublicRegisterPage;
