import React, { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Link, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, setSetupRequired } from '../redux/slices/authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, require2FA, requireSetup, tempUserId, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    // Redirect to 2FA verification if required
    if (require2FA && tempUserId) {
      navigate('/2fa-verify', { 
        state: { 
          userId: tempUserId,
          userName: user?.name 
        } 
      });
    }
    // Redirect to 2FA setup if required
    else if (requireSetup) {
      navigate('/2fa-setup');
    }
  }, [require2FA, requireSetup, tempUserId, user, navigate]);

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
      const payload = result.payload;
      
      // Handle 2FA verification required
      if (payload.require2FA) {
        navigate('/2fa-verify', { 
          state: { 
            userId: payload.data?.userId,
            userName: payload.data?.user?.name 
          } 
        });
        return;
      }
      
      // Handle 2FA setup required
      if (payload.requireSetup) {
        dispatch(setSetupRequired({
          token: payload.data.token,
          user: payload.data.user
        }));
        navigate('/2fa-setup');
        return;
      }
      
      // Normal login - redirect to dashboard
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
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mb: 2, textAlign: 'right' }}>
            <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
              نسيت كلمة المرور؟
            </Link>
          </Box>
          
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
          <Typography variant="body2" color="text.secondary">
            ليس لديك حساب؟{' '}
            <Link component={RouterLink} to="/signup" underline="hover">
              إنشاء حساب جديد
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
