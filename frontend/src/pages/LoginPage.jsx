import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Link, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../redux/slices/authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(formData));
    if (result.type === 'auth/login/fulfilled') {
      navigate('/dashboard');
    }
  };

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
          تسجيل الدخول
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          أدخل بياناتك للوصول إلى حسابك
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
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
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            ليس لديك حساب؟{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              إنشاء حساب جديد
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
