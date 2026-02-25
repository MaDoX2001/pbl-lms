import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../redux/slices/authSlice';
import api from '../services/api';
import invitationService from '../services/invitationService';
import { toast } from 'react-toastify';
import { useAppSettings } from '../context/AppSettingsContext';

// Password strength validation helper
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

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [searchParams] = useSearchParams();
  const { loading, error } = useSelector((state) => state.auth);

  // Main flow control
  const [flowType, setFlowType] = useState(null); // 'token', 'request', null
  const [step, setStep] = useState(0); // Step in the flow

  // Token-based registration data
  const [invitationToken, setInvitationToken] = useState('');
  const [invitationData, setInvitationData] = useState(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [invitationError, setInvitationError] = useState('');

  // Registration form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });

  // Request invitation form data
  const [requestData, setRequestData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });

  // Error and loading states
  const [validationError, setValidationError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Check invitation token on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setInvitationToken(token);
      setFlowType('token');
      setStep(0);
      checkInvitation(token);
    } else {
      setCheckingInvitation(false);
      setFlowType(null);
      setStep(0);
    }
  }, [searchParams]);

  const checkInvitation = async (token) => {
    try {
      const response = await api.get(`/auth/invitation/${token}`);
      setInvitationData(response.data.data);
      setFormData(prev => ({
        ...prev,
        email: response.data.data.email,
        role: response.data.data.role
      }));
      setCheckingInvitation(false);
    } catch (err) {
      setInvitationError(err.response?.data?.message || t('invalidInvitationToken'));
      setCheckingInvitation(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRequestChange = (e) => {
    setRequestData({
      ...requestData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle registration form submission (token-based)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // Validate name
    if (formData.name.trim().length < 3) {
      setValidationError(t('nameMin3'));
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setValidationError(t('passwordsMismatch'));
      return;
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(formData.password);
    if (!passwordStrength.isValid) {
      setValidationError(t('passwordStrengthRequirement'));
      return;
    }

    const result = await dispatch(register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      token: invitationToken,
      role: formData.role
    }));

    if (result.type === 'auth/register/fulfilled') {
      toast.success(t('accountCreatedSuccess'));
      // Redirect to 2FA setup (mandatory for all new users)
      navigate('/2fa-setup');
    }
  };

  // Handle request invitation submission
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setRequestLoading(true);

    try {
      // Validate inputs
      if (requestData.name.trim().length < 3) {
        setValidationError(t('nameMin3'));
        setRequestLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(requestData.email)) {
        setValidationError(t('invalidEmail'));
        setRequestLoading(false);
        return;
      }

      // Validate password strength
      const passwordStrength = validatePasswordStrength(requestData.password);
      if (!passwordStrength.isValid) {
        setValidationError(t('passwordStrengthRequirement'));
        setRequestLoading(false);
        return;
      }

      // Validate passwords match
      if (requestData.password !== requestData.confirmPassword) {
        setValidationError(t('passwordsMismatch'));
        setRequestLoading(false);
        return;
      }

      const response = await invitationService.requestInvitation(
        requestData.email,
        requestData.name,
        requestData.role
      );

      setRequestSent(true);
      setStep(1);
      toast.success(t('invitationRequestSentAndReviewed'));
    } catch (err) {
      setValidationError(
        err.response?.data?.message || t('requestSubmitError')
      );
    } finally {
      setRequestLoading(false);
    }
  };

  // Handle initial choice (when no token provided)
  const handleChoiceRequest = () => {
    setFlowType('request');
    setStep(0);
    setValidationError('');
  };

  const handleChoiceAlready = () => {
    navigate('/login');
  };

  // Loading state
  if (checkingInvitation && flowType === 'token') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state for token validation
  if (invitationError) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%' }}>
          <Alert severity="error" sx={{ mb: 2 }}>{invitationError}</Alert>
          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            للحصول على دعوة، يمكنك{' '}
            <Link
              component="button"
              onClick={() => navigate('/register')}
              sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            >
              طلب دعوة جديدة
            </Link>
          </Typography>
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
        py: 4
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" fontWeight={700}>
          {t('joinPlatformTitle')}
        </Typography>

        {/* FLOW 1: NO TOKEN - CHOOSE ACTION */}
        {flowType === null && !checkingInvitation && (
          <>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              {t('chooseJoinMethod')}
            </Typography>

            <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('noInvitationYet')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('sendJoinRequestDescription')}
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleChoiceRequest}
                  size="large"
                >
                  {t('requestInvitation')}
                </Button>
              </CardContent>
            </Card>

            <Divider sx={{ my: 2 }}>{t('or')}</Divider>

            <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('alreadyHaveAccount')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('loginWithAccountData')}
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  onClick={handleChoiceAlready}
                  size="large"
                >
                  {t('login')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* FLOW 2: REQUEST INVITATION */}
        {flowType === 'request' && (
          <>
            <Stepper activeStep={step} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>{t('requestDataStep')}</StepLabel>
              </Step>
              <Step>
                <StepLabel>{t('sentStep')}</StepLabel>
              </Step>
            </Stepper>

            {step === 0 && !requestSent && (
              <>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                  {t('enterDataForReview')}
                </Typography>

                {validationError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationError}
                  </Alert>
                )}

                <form onSubmit={handleRequestSubmit}>
                  <TextField
                    fullWidth
                    label={t('fullName')}
                    name="name"
                    value={requestData.name}
                    onChange={handleRequestChange}
                    required
                    placeholder={t('enterFullNamePlaceholder')}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label={t('email')}
                    name="email"
                    type="email"
                    value={requestData.email}
                    onChange={handleRequestChange}
                    required
                    placeholder={t('yourEmailPlaceholder')}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label={t('password')}
                    name="password"
                    type="password"
                    value={requestData.password}
                    onChange={handleRequestChange}
                    placeholder={t('enterStrongPassword')}
                    sx={{ mb: 1 }}
                    required
                  />
                  
                  {requestData.password && (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mb: 1 }}>
                        متطلبات كلمة المرور:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: validatePasswordStrength(requestData.password).hasMinLength ? '#2e7d32' : '#d32f2f' }}>
                          ✓ 8 أحرف على الأقل {validatePasswordStrength(requestData.password).hasMinLength ? '✓' : '✗'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: validatePasswordStrength(requestData.password).hasUpperCase ? '#2e7d32' : '#d32f2f' }}>
                          ✓ حروف كبيرة (A-Z) {validatePasswordStrength(requestData.password).hasUpperCase ? '✓' : '✗'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: validatePasswordStrength(requestData.password).hasLowerCase ? '#2e7d32' : '#d32f2f' }}>
                          ✓ حروف صغيرة (a-z) {validatePasswordStrength(requestData.password).hasLowerCase ? '✓' : '✗'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: validatePasswordStrength(requestData.password).hasNumbers ? '#2e7d32' : '#d32f2f' }}>
                          ✓ أرقام (0-9) {validatePasswordStrength(requestData.password).hasNumbers ? '✓' : '✗'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: validatePasswordStrength(requestData.password).hasSpecialChar ? '#2e7d32' : '#d32f2f' }}>
                          ✓ رموز خاصة (!@#$%^&* إلخ) {validatePasswordStrength(requestData.password).hasSpecialChar ? '✓' : '✗'}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    label={t('confirmPassword')}
                    name="confirmPassword"
                    type="password"
                    value={requestData.confirmPassword}
                    onChange={handleRequestChange}
                    placeholder={t('reenterPassword')}
                    sx={{ mb: 3 }}
                    required
                    error={requestData.confirmPassword && requestData.password !== requestData.confirmPassword}
                    helperText={requestData.confirmPassword && requestData.password !== requestData.confirmPassword ? t('passwordsMismatch') : ''}
                  />

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>{t('role')}</InputLabel>
                    <Select
                      name="role"
                      value={requestData.role}
                      onChange={handleRequestChange}
                      label={t('role')}
                    >
                      <MenuItem value="student">{t('student')}</MenuItem>
                      <MenuItem value="teacher">{t('teacher')}</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={requestLoading}
                  >
                    {requestLoading ? t('sending') : t('sendRequest')}
                  </Button>
                </form>

                <Typography
                  variant="caption"
                  display="block"
                  align="center"
                  sx={{ mt: 2, color: 'text.secondary' }}
                >
                  أو{' '}
                  <Link
                    component="button"
                    onClick={() => navigate('/login')}
                    sx={{ cursor: 'pointer' }}
                  >
                    {t('login')}
                  </Link>
                </Typography>
              </>
            )}

            {step === 1 && requestSent && (
              <Card sx={{ backgroundColor: '#e8f5e9' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                    {t('requestReceived')}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    سيتم مراجعة طلبك من قبل المدير وسنرسل لك دعوة على البريد: <br />
                    <strong>{requestData.email}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    تحقق من بريدك (والمجلد العشوائي أيضاً) خلال الساعات القادمة
                  </Typography>

                  <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate('/login')}
                    >
                      {t('login')}
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        setFlowType(null);
                        setStep(0);
                        setRequestSent(false);
                        setRequestData({ name: '', email: '', password: '', confirmPassword: '', role: 'student' });
                      }}
                    >
                      {t('newRequest')}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* FLOW 3: TOKEN-BASED REGISTRATION */}
        {flowType === 'token' && invitationData && (
          <>
            <Stepper activeStep={step} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>{t('personalDataStep')}</StepLabel>
              </Step>
              <Step>
                <StepLabel>{t('passwordStep')}</StepLabel>
              </Step>
              <Step>
                <StepLabel>{t('createdStep')}</StepLabel>
              </Step>
            </Stepper>

            {step === 0 && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    📧 <strong>البريد:</strong> {invitationData.email} <br />
                    👤 <strong>الدور:</strong> {invitationData.role === 'student' ? 'طالب' : 'معلم'}
                  </Typography>
                </Alert>

                {validationError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationError}
                  </Alert>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (formData.name.trim().length < 3) {
                      setValidationError(t('nameMin3'));
                      return;
                    }
                    setValidationError('');
                    setStep(1);
                  }}
                >
                  <TextField
                    fullWidth
                    label={t('fullName')}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder={t('enterFullNamePlaceholder')}
                    sx={{ mb: 3 }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                  >
                    {t('next')}
                  </Button>
                </form>
              </>
            )}

            {step === 1 && (
              <>
                {validationError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {validationError}
                  </Alert>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    if (formData.password !== formData.confirmPassword) {
                      setValidationError(t('passwordsMismatch'));
                      return;
                    }

                    // Validate password strength
                    const passwordStrength = validatePasswordStrength(formData.password);
                    if (!passwordStrength.isValid) {
                      setValidationError(t('passwordStrengthRequirement'));
                      return;
                    }

                    setValidationError('');
                    setStep(2);
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('chooseStrongPassword')}
                  </Typography>

                  <TextField
                    fullWidth
                    label={t('password')}
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    sx={{ mb: 1 }}
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
                    label={t('confirmPassword')}
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    sx={{ mb: 3 }}
                    error={formData.confirmPassword && formData.password !== formData.confirmPassword}
                    helperText={formData.confirmPassword && formData.password !== formData.confirmPassword ? t('passwordsMismatch') : ''}
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setStep(0)}
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                    >
                      {t('next')}
                    </Button>
                  </Box>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleRegisterSubmit}>
                  <Card sx={{ backgroundColor: '#f5f5f5', mb: 3 }}>
                    <CardContent>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>الاسم:</strong> {formData.name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>البريد:</strong> {formData.email}
                      </Typography>
                      <Typography variant="body2">
                        <strong>الدور:</strong> {formData.role === 'student' ? 'طالب' : 'معلم'}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                  >
                    {loading ? t('creatingAccount') : t('createAccount')}
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setStep(1)}
                    sx={{ mt: 1 }}
                  >
                    {t('previous')}
                  </Button>
                </form>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default RegisterPage;
