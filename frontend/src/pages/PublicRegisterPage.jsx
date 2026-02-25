import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAppSettings } from '../context/AppSettingsContext';

const PublicRegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      setError(t('passwordsMismatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('passwordMin8'));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/public-register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success(t('registerRequestSubmitted'));
        
        // Send email verification OTP
        try {
          await api.post('/email/send-verification-otp', { email: formData.email });
        } catch (err) {
          console.error('Failed to send verification email:', err);
        }
        
        setTimeout(() => {
          navigate('/verify-email', { state: { email: formData.email } });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('genericError'));
      toast.error(err.response?.data?.message || t('genericError'));
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
              {t('requestSentSuccess')}
            </Typography>
            <Typography variant="body2">
              {t('requestApprovalMsg')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>
              {t('redirectingToEmailVerification')}
            </Typography>
          </Alert>
          <Button
            fullWidth
            variant="outlined"
            component={RouterLink}
            to="/login"
          >
            {t('backToLogin')}
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
          {t('registerTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {t('registerSubtitle')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('fullName')}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('chooseRole')} *</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label={`${t('chooseRole')} *`}
              required
            >
              <MenuItem value="student">{t('student')}</MenuItem>
              <MenuItem value="teacher">{t('teacher')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('password')}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label={t('confirmPassword')}
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? t('registering') : t('registerTitle')}
          </Button>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('alreadyHaveAccount')}{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              {t('login')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default PublicRegisterPage;
