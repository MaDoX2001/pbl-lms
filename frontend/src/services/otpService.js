import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const otpService = {
  // Generate OTP secret (get QR code)
  generateOTPSecret: async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/otp/generate`, { userId }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Enable OTP (2FA)
  enableOTP: async (userId, token) => {
    try {
      const response = await axios.post(`${API_URL}/otp/enable`, 
        { userId, token },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify OTP during login
  verifyOTPLogin: async (userId, token, useBackupCode = false) => {
    try {
      const response = await axios.post(`${API_URL}/otp/verify-login`, {
        userId,
        token,
        useBackupCode
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Disable OTP (2FA)
  disableOTP: async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/otp/disable`,
        { userId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get OTP status
  getOTPStatus: async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/otp/status`, {
        params: { userId },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Regenerate backup codes
  regenerateBackupCodes: async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/otp/regenerate-backup-codes`,
        { userId },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default otpService;
