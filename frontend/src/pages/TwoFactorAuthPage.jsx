import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Link
} from '@mui/material';
import {
  SecurityOutlined,
  CheckCircleOutline,
  PhoneAndroidOutlined
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { setCredentials } from '../redux/slices/authSlice';
import { useAppSettings } from '../context/AppSettingsContext';

const TwoFactorAuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useAppSettings();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  
  const userId = location.state?.userId;
  const userName = location.state?.userName;

  useEffect(() => {
    if (!userId) {
      toast.error(t('twoFactorLoginInfoMissing'));
      navigate('/login');
    }
  }, [userId, navigate, t]);

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSeconds(0);
      return undefined;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(lockoutUntil).getTime() - Date.now()) / 1000));
      setLockoutSeconds(remaining);

      if (remaining === 0) {
        setLockoutUntil(null);
        setError('');
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  const formatRemainingTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return t('lockoutSecondsOnly', { seconds });
    }

    return t('lockoutMinutesSeconds', {
      minutes,
      seconds
    });
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (lockoutSeconds > 0) {
      setError(t('lockoutHint'));
      return;
    }
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t('otp6Digits'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/otp/verify-login', {
        userId,
        token: verificationCode
      });

      if (response.data.success) {
        setLockoutUntil(null);
        setLockoutSeconds(0);

        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        
        // Update Redux state
        dispatch(setCredentials({
          user: response.data.data.user,
          token: response.data.data.token
        }));

        toast.success(t('twoFactorLoginSuccess'));
        navigate('/dashboard');
      }
    } catch (err) {
      const responseData = err.response?.data;
      setError(responseData?.message || t('twoFactorWrongCode'));

      if (err.response?.status === 423 && responseData?.lockoutUntil) {
        setLockoutUntil(responseData.lockoutUntil);
        setLockoutSeconds(responseData.lockoutSeconds || 0);
      }

      toast.error(err.response?.data?.message || t('twoFactorWrongCode'));
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={10}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <SecurityOutlined sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight="bold">
                {t('twoFactorTitle')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {userName ? t('helloUser', { name: userName }) : t('helloGeneric')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('twoFactorPrompt')}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Verification Form */}
            <form onSubmit={handleVerify}>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label={t('verificationCode')}
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="123456"
                  inputProps={{ 
                    maxLength: 6,
                    style: { 
                      textAlign: 'center', 
                      fontSize: '32px', 
                      letterSpacing: '12px',
                      fontWeight: 'bold'
                    }
                  }}
                  autoFocus
                  disabled={loading}
                />
              </Box>

              {lockoutSeconds > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  {t('lockoutCountdown', { time: formatRemainingTime(lockoutSeconds) })}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || verificationCode.length !== 6 || lockoutSeconds > 0}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : t('twoFactorVerify')}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                {t('backToLogin')}
              </Button>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Link component={RouterLink} to="/reset-totp" underline="hover" variant="body2">
                  إعادة تعيين المصادقة الثنائية
                </Link>
              </Box>
            </form>

            {/* Info Section */}
            <Paper 
              elevation={0} 
              sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: 'info.lighter',
                borderLeft: 3,
                borderColor: 'info.main'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PhoneAndroidOutlined sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="subtitle2" fontWeight="bold">
                  {t('tip')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {lockoutSeconds > 0 ? t('lockoutHint') : t('otpRotates')}
              </Typography>
            </Paper>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <SecurityOutlined sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
            {t('twoFactorProtects')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default TwoFactorAuthPage;
