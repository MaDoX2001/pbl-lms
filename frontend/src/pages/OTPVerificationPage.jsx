import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Tabs,
  Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import otpService from '../services/otpService';
import { toast } from 'react-toastify';
import { useAppSettings } from '../context/AppSettingsContext';

const OTPVerificationPage = ({ userId, onSuccess }) => {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [otpToken, setOtpToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0: OTP, 1: Backup Code

  const handleVerifyOTP = async () => {
    if (!otpToken || otpToken.length !== 6) {
      toast.error(t('otp6Digits'));
      return;
    }

    setLoading(true);
    try {
      await otpService.verifyOTPLogin(userId, otpToken, false);
      toast.success(t('otpVerifiedSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || t('otpInvalid'));
      setOtpToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    if (!backupCode) {
      toast.error(t('backupCodeRequired'));
      return;
    }

    setLoading(true);
    try {
      await otpService.verifyOTPLogin(userId, backupCode, true);
      toast.success(t('verificationSuccess'));
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || t('backupCodeInvalid'));
      setBackupCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: '50px auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, textAlign: 'center' }}>
            {t('twoFactorVerificationTitle')}
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            {t('twoFactorVerificationInfo')}
          </Alert>

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label={t('otpCodeTab')} />
            <Tab label={t('backupCodeTab')} />
          </Tabs>

          {tabValue === 0 && (
            <Box>
              <TextField
                fullWidth
                label={t('otpCodeLabel')}
                placeholder={t('enter6Digits')}
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.slice(0, 6))}
                inputProps={{ maxLength: 6, inputMode: 'numeric' }}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleVerifyOTP}
                disabled={loading || !otpToken}
              >
                {loading ? <CircularProgress size={24} /> : t('verify')}
              </Button>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <TextField
                fullWidth
                label={t('backupCodeLabel')}
                placeholder={t('enterBackupCode')}
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleVerifyBackupCode}
                disabled={loading || !backupCode}
              >
                {loading ? <CircularProgress size={24} /> : t('verify')}
              </Button>
            </Box>
          )}

          <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'textSecondary' }}>
            <Link href="/login" underline="hover">
              {t('backToLogin')}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OTPVerificationPage;
