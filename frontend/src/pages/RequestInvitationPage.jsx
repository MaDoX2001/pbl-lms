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
import { useAppSettings } from '../context/AppSettingsContext';

const RequestInvitationPage = () => {
  const { t } = useAppSettings();
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
      toast.error(t('nameMin3'));
      return;
    }
    if (!formData.email || !formData.email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      toast.error(t('invalidEmail'));
      return;
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(formData.password);
    if (!passwordStrength.isValid) {
      toast.error(t('passwordStrengthRequirement'));
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('passwordsMismatch'));
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
      toast.error(error.message || t('requestSubmitError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!checkEmail || !checkEmail.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
      toast.error(t('invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const response = await invitationService.checkRequestStatus(checkEmail);
      if (response.found) {
        setStatusData(response.data);
      } else {
        setStatusData(null);
        toast.info(t('requestNotFoundForEmail'));
      }
    } catch (error) {
      toast.error(error.message || t('statusCheckError'));
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
        return t('pendingReview');
      case 'approved':
        return t('approved');
      case 'rejected':
        return t('rejected');
      default:
        return status;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>{t('requestInvitationStep')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t('checkStatusStep')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t('completedStep')}</StepLabel>
        </Step>
      </Stepper>

      {step === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <PersonAddOutlined sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" fontWeight="bold">
                {t('requestInvitation')}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              {t('requestInvitationInfo')}
            </Alert>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label={t('fullName')}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t('enterFullNamePlaceholder')}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label={t('email')}
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
                label={t('password')}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t('enterStrongPassword')}
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
                    {t('passwordRequirements')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasMinLength ? '#2e7d32' : '#d32f2f' }}>
                      ✓ {t('passwordReqMin8')} {validatePasswordStrength(formData.password).hasMinLength ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasUpperCase ? '#2e7d32' : '#d32f2f' }}>
                      ✓ {t('passwordReqUpper')} {validatePasswordStrength(formData.password).hasUpperCase ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasLowerCase ? '#2e7d32' : '#d32f2f' }}>
                      ✓ {t('passwordReqLower')} {validatePasswordStrength(formData.password).hasLowerCase ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasNumbers ? '#2e7d32' : '#d32f2f' }}>
                      ✓ {t('passwordReqNumbers')} {validatePasswordStrength(formData.password).hasNumbers ? '✓' : '✗'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: validatePasswordStrength(formData.password).hasSpecialChar ? '#2e7d32' : '#d32f2f' }}>
                      ✓ {t('passwordReqSpecial')} {validatePasswordStrength(formData.password).hasSpecialChar ? '✓' : '✗'}
                    </Typography>
                  </Box>
                </Box>
              )}

              <TextField
                fullWidth
                label={t('confirmPassword')}
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={t('reenterPassword')}
                sx={{ mb: 3 }}
                required
                error={formData.confirmPassword && formData.password !== formData.confirmPassword}
                helperText={formData.confirmPassword && formData.password !== formData.confirmPassword ? t('passwordsMismatch') : ''}
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
                <InputLabel id="request-invitation-role-label">{t('role')}</InputLabel>
                <Select
                  id="request-invitation-role"
                  labelId="request-invitation-role-label"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  label={t('role')}
                >
                  <MenuItem value="student">{t('student')}</MenuItem>
                  <MenuItem value="teacher">{t('teacher')}</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                type="submit"
                disabled={loading}
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : t('sendRequest')}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={() => setStep(1)}
                sx={{ mt: 2 }}
              >
                {t('checkExistingRequestStatus')}
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
                {t('checkRequestStatusTitle')}
              </Typography>
            </Box>

            <TextField
              fullWidth
              label={t('email')}
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
              {loading ? <CircularProgress size={24} /> : t('verify')}
            </Button>

            {statusData && (
              <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                <Alert severity={getStatusColor(statusData.status)}>
                  <strong>{t('status')}:</strong> {getStatusText(statusData.status)}
                </Alert>
                {statusData.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>{t('rejectionReason')}:</strong> {statusData.rejectionReason}
                  </Alert>
                )}
              </Paper>
            )}

            <Button
              variant="outlined"
              fullWidth
              onClick={() => setStep(0)}
            >
              {t('back')}
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
                {t('requestSentSuccessTitle')}
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 3 }}>
                {t('requestSentSuccessSubtitle')}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setStep(0);
                  setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
                }}
              >
                {t('newRequest')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default RequestInvitationPage;
