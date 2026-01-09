import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton,
  InputAdornment
} from '@mui/material';
import { PersonAddOutlined, CheckCircleOutline, EmailOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import invitationService from '../services/invitationService';
import { toast } from 'react-toastify';

const RequestInvitationPage = () => {
  const [step, setStep] = useState(0); // 0: Request, 1: Check Status, 2: Success
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [statusData, setStatusData] = useState(null);
  const [checkEmail, setCheckEmail] = useState('');

  // Password strength validation
  const validatePasswordStrength = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const hasMinLength = password.length >= 8;

    return {
      isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      hasMinLength
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || formData.name.length < 3) {
      toast.error('الاسم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (!formData.email || !formData.email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      toast.error('البريد الإلكتروني غير صحيح');
      return;
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(formData.password);
    if (!passwordStrength.isValid) {
      toast.error('كلمة المرور يجب أن تحتوي على: 8 أحرف على الأقل، حروف صغيرة، حروف كبيرة، أرقام، رموز');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending request with data:', {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        hasPassword: !!formData.password,
        passwordLength: formData.password?.length
      });
      
      const response = await invitationService.requestInvitation(
        formData.email,
        formData.name,
        formData.role,
        formData.password
      );
      toast.success(response.message);
      setStep(2); // Go to success step
    } catch (error) {
      console.error('Request error:', error);
      toast.error(error.message || 'خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!checkEmail || !checkEmail.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      toast.error('البريد الإلكتروني غير صحيح');
      return;
    }

    setLoading(true);
    try {
      const response = await invitationService.checkRequestStatus(checkEmail);
      if (response.found) {
        setStatusData(response.data);
      } else {
        setStatusData(null);
        toast.info('لم يتم العثور على طلب لهذا البريد الإلكتروني');
      }
    } catch (error) {
      toast.error(error.message || 'خطأ في التحقق');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'info';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'قيد المراجعة';
      case 'approved':
        return 'موافق عليه';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>طلب الدعوة</StepLabel>
        </Step>
        <Step>
          <StepLabel>التحقق من الحالة</StepLabel>
        </Step>
        <Step>
          <StepLabel>اكتمل</StepLabel>
        </Step>
      </Stepper>

      {step === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <PersonAddOutlined sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                طلب دعوة
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              هل تريد الانضمام إلى منصة التعلم بالمشروعات؟ أرسل طلب دعوة وسيقوم الإدمن بمراجعته وإرسال لك دعوة على بريدك الإلكتروني.
            </Alert>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="الاسم الكامل"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="أدخل اسمك الكامل"
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="البريد الإلكتروني"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="كلمة المرور"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="أدخل كلمة مرور قوية"
                sx={{ mb: 1 }}
                required
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
                  )
                }}
              />
              
              {formData.password && (
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 1 }}>
                    متطلبات كلمة المرور:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasMinLength ? '#2e7d32' : '#d32f2f' }}>
                      ✓ 8 أحرف على الأقل {validatePasswordStrength(formData.password).hasMinLength ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasUpperCase ? '#2e7d32' : '#d32f2f' }}>
                      ✓ حروف كبيرة (A-Z) {validatePasswordStrength(formData.password).hasUpperCase ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasLowerCase ? '#2e7d32' : '#d32f2f' }}>
                      ✓ حروف صغيرة (a-z) {validatePasswordStrength(formData.password).hasLowerCase ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasNumbers ? '#2e7d32' : '#d32f2f' }}>
                      ✓ أرقام (0-9) {validatePasswordStrength(formData.password).hasNumbers ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasSpecialChar ? '#2e7d32' : '#d32f2f' }}>
                      ✓ رموز خاصة (!@#$%^&* إلخ) {validatePasswordStrength(formData.password).hasSpecialChar ? '✓' : '✗'}
                    </Typography>
                  </Box>
                </Box>
              )}

              <TextField
                fullWidth
                label="تأكيد كلمة المرور"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="أعد إدخال كلمة المرور"
                sx={{ mb: 3 }}
                required
                error={formData.confirmPassword && formData.password !== formData.confirmPassword}
                helperText={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'كلمات المرور غير متطابقة' : ''}
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
                  )
                }}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>الدور</InputLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  label="الدور"
                >
                  <MenuItem value="student">طالب</MenuItem>
                  <MenuItem value="teacher">معلم</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                type="submit"
                disabled={loading}
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : 'إرسال الطلب'}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => setStep(1)}
                sx={{ mt: 2 }}
              >
                تحقق من حالة طلب موجود
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <EmailOutlined sx={{ fontSize: 40, mr: 2, color: 'info.main' }} />
              <Typography variant="h5" fontWeight="bold">
                التحقق من حالة الطلب
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              value={checkEmail}
              onChange={(e) => setCheckEmail(e.target.value)}
              placeholder="your@email.com"
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleCheckStatus}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'التحقق'}
            </Button>

            {statusData && (
              <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                <Alert severity={getStatusColor(statusData.status)}>
                  <strong>الحالة:</strong> {getStatusText(statusData.status)}
                </Alert>
                {statusData.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>سبب الرفض:</strong> {statusData.rejectionReason}
                  </Alert>
                )}
              </Paper>
            )}

            <Button
              variant="outlined"
              fullWidth
              onClick={() => setStep(0)}
            >
              العودة
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
              <CheckCircleOutline sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                تم إرسال الطلب بنجاح
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 3 }}>
                سيقوم الإدمن بمراجعة طلبك وإرسال دعوة على بريدك الإلكتروني
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setStep(0);
                  setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
                }}
              >
                طلب دعوة جديد
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default RequestInvitationPage;
