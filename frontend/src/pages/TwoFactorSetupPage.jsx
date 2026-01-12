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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  SecurityOutlined,
  PhoneAndroidOutlined,
  CheckCircleOutline,
  InfoOutlined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import api from '../services/api';
import { toast } from 'react-toastify';
import { loadUser } from '../redux/slices/authSlice';

const TwoFactorSetupPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  const steps = [
    'تنزيل تطبيق المصادقة',
    'مسح رمز QR',
    'التحقق من الإعداد'
  ];

  useEffect(() => {
    // Check if user already has 2FA enabled
    if (user && user.twoFactorEnabled && !user.twoFactorSetupRequired) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/otp/generate');
      
      if (response.data.success) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setActiveStep(1);
        toast.success('تم إنشاء رمز QR بنجاح');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إعداد المصادقة الثنائية');
      toast.error(err.response?.data?.message || 'خطأ في إعداد المصادقة الثنائية');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('رمز التحقق يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/otp/enable', {
        token: verificationCode
      });

      if (response.data.success) {
        toast.success('تم تفعيل المصادقة الثنائية بنجاح!');
        setActiveStep(2);
        
        // Reload user data
        await dispatch(loadUser());
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'رمز التحقق غير صحيح');
      toast.error(err.response?.data?.message || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      handleSetup2FA();
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="md">
        <Card elevation={10}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <SecurityOutlined sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight="bold">
                إعداد المصادقة الثنائية
              </Typography>
              <Typography variant="body1" color="text.secondary">
                المصادقة الثنائية إلزامية لجميع المستخدمين لحماية حسابك
              </Typography>
            </Box>

            {/* Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>هام:</strong> المصادقة الثنائية مطلوبة للوصول إلى جميع ميزات النظام. 
                يرجى اتباع الخطوات أدناه لإكمال الإعداد.
              </Typography>
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Stepper */}
            <Stepper activeStep={activeStep} orientation="vertical">
              {/* Step 1: Download Authenticator App */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">تنزيل تطبيق المصادقة</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    قم بتنزيل أحد تطبيقات المصادقة التالية على هاتفك:
                  </Typography>
                  
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <PhoneAndroidOutlined color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Google Authenticator"
                        secondary="iOS و Android"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PhoneAndroidOutlined color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Microsoft Authenticator"
                        secondary="iOS و Android"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PhoneAndroidOutlined color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Authy"
                        secondary="iOS و Android"
                      />
                    </ListItem>
                  </List>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={loading}
                      sx={{ mr: 1 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'التالي'}
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Step 2: Scan QR Code */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">مسح رمز QR</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    افتح تطبيق المصادقة وامسح رمز QR التالي:
                  </Typography>

                  {qrCode && (
                    <Paper elevation={3} sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        style={{ maxWidth: '250px', width: '100%' }}
                      />
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        أو أدخل المفتاح يدوياً:
                      </Typography>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.100', 
                          fontFamily: 'monospace',
                          wordBreak: 'break-all'
                        }}
                      >
                        {secret}
                      </Paper>
                    </Paper>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mr: 1 }}
                    >
                      التالي
                    </Button>
                    <Button
                      onClick={handleBack}
                      disabled={loading}
                    >
                      السابق
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              {/* Step 3: Verify Setup */}
              <Step>
                <StepLabel>
                  <Typography variant="h6">التحقق من الإعداد</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة:
                  </Typography>

                  <TextField
                    fullWidth
                    label="رمز التحقق"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      setError('');
                    }}
                    placeholder="123456"
                    inputProps={{ 
                      maxLength: 6,
                      style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }
                    }}
                    sx={{ mb: 2 }}
                    autoFocus
                  />

                  <Alert severity="info" icon={<InfoOutlined />} sx={{ mb: 2 }}>
                    تأكد من إدخال الرمز الحالي من تطبيق المصادقة. يتغير الرمز كل 30 ثانية.
                  </Alert>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleVerify2FA}
                      disabled={loading || verificationCode.length !== 6}
                      sx={{ mr: 1 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'تفعيل المصادقة الثنائية'}
                    </Button>
                    <Button
                      onClick={handleBack}
                      disabled={loading}
                    >
                      السابق
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>

            {/* Success Step */}
            {activeStep === steps.length && (
              <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.light', textAlign: 'center' }}>
                <CheckCircleOutline sx={{ fontSize: 60, color: 'success.dark', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  تم تفعيل المصادقة الثنائية بنجاح!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  جاري التوجيه إلى لوحة التحكم...
                </Typography>
              </Paper>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <SecurityOutlined sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
            تحمي المصادقة الثنائية حسابك من الوصول غير المصرح به
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default TwoFactorSetupPage;
