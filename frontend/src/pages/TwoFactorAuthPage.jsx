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
  Paper
} from '@mui/material';
import {
  SecurityOutlined,
  CheckCircleOutline,
  PhoneAndroidOutlined
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { setCredentials } from '../redux/slices/authSlice';

const TwoFactorAuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const userId = location.state?.userId;
  const userName = location.state?.userName;

  useEffect(() => {
    if (!userId) {
      toast.error('معلومات تسجيل الدخول غير موجودة');
      navigate('/login');
    }
  }, [userId, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/2fa/verify-login', {
        userId,
        token: verificationCode
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.data.token);
        
        // Update Redux state
        dispatch(setCredentials({
          user: response.data.data.user,
          token: response.data.data.token
        }));

        toast.success('تم تسجيل الدخول بنجاح!');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'رمز التحقق غير صحيح');
      toast.error(err.response?.data?.message || 'رمز التحقق غير صحيح');
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
                المصادقة الثنائية
              </Typography>
              <Typography variant="body1" color="text.secondary">
                مرحباً {userName || 'بك'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
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
                  label="رمز التحقق"
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || verificationCode.length !== 6}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'تحقق'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                العودة لتسجيل الدخول
              </Button>
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
                  نصيحة
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                الرمز يتغير كل 30 ثانية. تأكد من إدخال الرمز الحالي من تطبيق المصادقة.
              </Typography>
            </Paper>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <SecurityOutlined sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
            المصادقة الثنائية تحمي حسابك من الوصول غير المصرح به
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default TwoFactorAuthPage;

    setLoading(true);
    try {
      await otpService.disableOTP(user._id);
      toast.success('تم تعطيل المصادقة الثنائية');
      setDisableToken('');
      checkOTPStatus();
    } catch (error) {
      toast.error(error.message || 'خطأ في تعطيل المصادقة الثنائية');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الرمز الاحتياطي');
  };

  const handleRegenerateBackupCodes = async () => {
    setLoading(true);
    try {
      const response = await otpService.regenerateBackupCodes(user._id);
      setBackupCodes(response.backupCodes);
      toast.success('تم توليد رموز احتياطية جديدة');
    } catch (error) {
      toast.error(error.message || 'خطأ في توليد الرموز الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  if (!otpStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', py: 4 }}>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <SecurityOutlined sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold">المصادقة الثنائية (2FA)</Typography>
          </Box>

          <Alert 
            severity={otpStatus.isEnabled ? 'success' : 'warning'}
            sx={{ mb: 3 }}
          >
            {otpStatus.isEnabled 
              ? '✅ المصادقة الثنائية مفعلة'
              : '⚠️ المصادقة الثنائية غير مفعلة. فعّلها لزيادة أمان حسابك'}
          </Alert>

          {otpStatus.isEnabled && (
            <Box sx={{ mb: 3 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutline color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="حالة المصادقة"
                    secondary="مفعلة ومحمية"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningOutlined color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="رموز احتياطية متبقية"
                    secondary={`${otpStatus.remainingBackupCodes} رموز`}
                  />
                </ListItem>
              </List>
              <Divider sx={{ my: 2 }} />

              <Button
                variant="contained"
                color="warning"
                fullWidth
                onClick={handleRegenerateBackupCodes}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                توليد رموز احتياطية جديدة
              </Button>

              <TextField
                fullWidth
                label="رمز OTP"
                placeholder="أدخل رمز من تطبيق المصادقة"
                value={disableToken}
                onChange={(e) => setDisableToken(e.target.value.slice(0, 6))}
                inputProps={{ maxLength: 6 }}
                type="number"
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                color="error"
                fullWidth
                onClick={handleDisableOTP}
                disabled={loading || !disableToken}
              >
                تعطيل المصادقة الثنائية
              </Button>
            </Box>
          )}

          {!otpStatus.isEnabled && (
            <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                المصادقة الثنائية توفر طبقة إضافية من الأمان. ستحتاج إلى تطبيق المصادقة (مثل Google Authenticator) لتسجيل الدخول.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleGenerateQR}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'ابدأ إعداد المصادقة الثنائية'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {step === 'setup' && 'إعداد المصادقة الثنائية'}
          {step === 'verify' && 'التحقق من الإعداد'}
          {step === 'done' && 'تم التفعيل بنجاح'}
        </DialogTitle>

        <DialogContent>
          {step === 'setup' && qrCode && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                امسح هذا الرمز الثنائي باستخدام تطبيق Google Authenticator أو Microsoft Authenticator
              </Typography>
              <Box display="flex" justifyContent="center" sx={{ my: 2 }}>
                <img src={qrCode} alt="QR Code" width={300} />
              </Box>
            </Box>
          )}

          {step === 'verify' && (
            <Box>
              <TextField
                fullWidth
                label="رمز OTP"
                placeholder="أدخل الرمز من تطبيق المصادقة"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.slice(0, 6))}
                inputProps={{ maxLength: 6 }}
                type="number"
                sx={{ mb: 2 }}
              />
              <Alert severity="info" sx={{ mb: 2 }}>
                احفظ هذه الرموز الاحتياطية في مكان آمن. يمكنك استخدامها لدخول حسابك إذا فقدت الوصول إلى تطبيق المصادقة.
              </Alert>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                {backupCodes.map((code, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      py: 1,
                      px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'grey.100' }
                    }}
                  >
                    <Typography variant="body2" fontFamily="monospace">{code}</Typography>
                    <Button
                      size="small"
                      startIcon={<FileCopyOutlined />}
                      onClick={() => handleCopyBackupCode(code)}
                    >
                      نسخ
                    </Button>
                  </Box>
                ))}
              </Paper>
            </Box>
          )}

          {step === 'done' && (
            <Alert severity="success">
              ✅ تم تفعيل المصادقة الثنائية بنجاح!
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          {step === 'verify' && (
            <>
              <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
              <Button
                variant="contained"
                onClick={handleEnableOTP}
                disabled={loading || !verificationToken}
              >
                {loading ? <CircularProgress size={24} /> : 'تأكيد'}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => setOpenDialog(false)} variant="contained">
              حسناً
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TwoFactorAuthPage;
