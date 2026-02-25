import React, { useState, useEffect } from 'react';
import { Box, Paper, TextField, Button, Typography, Link, Alert } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, setSetupRequired } from '../redux/slices/authSlice';
import { useAppSettings } from '../context/AppSettingsContext';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const { t } = useAppSettings();

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
      const payload = result.payload;
      
      // Handle email verification required
      if (payload.requiresEmailVerification) {
        navigate('/verify-email', { 
          state: { 
            email: payload.email || formData.email
          } 
        });
        return;
      }
      
      // Handle 2FA verification required
      if (payload.requiresOTP || payload.require2FA) {
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
          token: payload.data?.token,
          user: payload.data?.user
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
          {t('loginTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {t('loginSubtitle')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            id="email"
            label={t('email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            id="password"
            label={t('password')}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ mb: 2, textAlign: 'right' }}>
            <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
              {t('forgotPassword')}
            </Link>
          </Box>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? t('loggingIn') : t('login')}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('noAccount')}{' '}
            <Link component={RouterLink} to="/signup" underline="hover">
              {t('createAccount')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
