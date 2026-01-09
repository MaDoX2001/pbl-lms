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

const OTPVerificationPage = ({ userId, onSuccess }) => {
  const navigate = useNavigate();
  const [otpToken, setOtpToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0); // 0: OTP, 1: Backup Code

  const handleVerifyOTP = async () => {
    if (!otpToken || otpToken.length !== 6) {
      toast.error('رمز OTP يجب أن يكون 6 أرقام');
      return;
    }

    setLoading(true);
    try {
      await otpService.verifyOTPLogin(userId, otpToken, false);
      toast.success('تم التحقق من OTP بنجاح');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'رمز OTP غير صحيح');
      setOtpToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    if (!backupCode) {
      toast.error('الرمز الاحتياطي مطلوب');
      return;
    }

    setLoading(true);
    try {
      await otpService.verifyOTPLogin(userId, backupCode, true);
      toast.success('تم التحقق بنجاح');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'الرمز الاحتياطي غير صحيح');
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
            التحقق من المصادقة الثنائية
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            أدخل الرمز من تطبيق المصادقة أو استخدم رمز احتياطي
          </Alert>

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="رمز OTP" />
            <Tab label="رمز احتياطي" />
          </Tabs>

          {tabValue === 0 && (
            <Box>
              <TextField
                fullWidth
                label="رمز OTP"
                placeholder="أدخل 6 أرقام"
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
                {loading ? <CircularProgress size={24} /> : 'تحقق'}
              </Button>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <TextField
                fullWidth
                label="الرمز الاحتياطي"
                placeholder="أدخل رمز احتياطي"
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
                {loading ? <CircularProgress size={24} /> : 'تحقق'}
              </Button>
            </Box>
          )}

          <Typography variant="body2" sx={{ mt: 3, textAlign: 'center', color: 'textSecondary' }}>
            <Link href="/login" underline="hover">
              العودة إلى تسجيل الدخول
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OTPVerificationPage;
