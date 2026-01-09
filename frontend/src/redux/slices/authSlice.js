import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { toast } from 'react-toastify';

// Async thunks
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.setItem('token', response.data.data.token);
      toast.success('تم التسجيل بنجاح!');
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل التسجيل');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.data.token);
      toast.success('تم تسجيل الدخول بنجاح!');
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تسجيل الدخول');
      return rejectWithValue(error.response?.data);
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/users/${userId}`, data);
      toast.success('تم تحديث الملف الشخصي بنجاح!');
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل التحديث');
      return rejectWithValue(error.response?.data);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: false,
    loading: false,
    error: null,
    require2FA: false,
    requireSetup: false,
    tempUserId: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.require2FA = false;
      state.requireSetup = false;
      state.tempUserId = null;
      toast.info('تم تسجيل الخروج');
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.require2FA = false;
      state.requireSetup = false;
      state.tempUserId = null;
    },
    set2FARequired: (state, action) => {
      state.require2FA = true;
      state.tempUserId = action.payload.userId;
    },
    setSetupRequired: (state, action) => {
      state.requireSetup = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Check if setup is required
        if (action.payload.user.twoFactorSetupRequired) {
          state.requireSetup = true;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'فشل التسجيل';
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        // Check if 2FA verification is required
        if (action.payload.require2FA) {
          state.require2FA = true;
          state.tempUserId = action.payload.userId;
          return;
        }
        // Check if 2FA setup is required
        if (action.payload.requireSetup) {
          state.requireSetup = true;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          return;
        }
        // Normal login
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'فشل تسجيل الدخول';
      })
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        // Check if setup is still required
        if (action.payload.twoFactorSetupRequired && !action.payload.twoFactorEnabled) {
          state.requireSetup = true;
        } else {
          state.requireSetup = false;
        }
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        localStorage.removeItem('token');
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      });
  },
});

export const { logout, clearError, setCredentials, set2FARequired, setSetupRequired } = authSlice.actions;
export default authSlice.reducer;
