import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { translate as t } from '../../i18n/translate';

// Async thunks
export const fetchStudentProgress = createAsyncThunk(
  'progress/fetchStudentProgress',
  async (studentId, { rejectWithValue }) => {
    try {
      const endpoint = studentId ? `/progress/student/${studentId}` : '/progress/student/me';
      const response = await api.get(endpoint);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const fetchProjectProgress = createAsyncThunk(
  'progress/fetchProjectProgress',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/progress/${projectId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateMilestone = createAsyncThunk(
  'progress/updateMilestone',
  async ({ projectId, milestoneId, completed }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/progress/${projectId}/milestone/${milestoneId}`,
        { completed }
      );
      toast.success(completed ? t('milestoneCompleted') : t('milestoneUncompleted'));
      return response.data.data;
    } catch (error) {
      toast.error(t('milestoneUpdateFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

export const submitProject = createAsyncThunk(
  'progress/submitProject',
  async ({ projectId, submissionData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/progress/${projectId}/submit`, submissionData);
      toast.success(t('projectSubmitSuccess'));
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectSubmitFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

const progressSlice = createSlice({
  name: 'progress',
  initialState: {
    studentProgress: [],
    currentProgress: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentProgress: (state) => {
      state.currentProgress = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Student Progress
      .addCase(fetchStudentProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.studentProgress = action.payload;
      })
      .addCase(fetchStudentProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || t('progressLoadFailed');
      })
      // Fetch Project Progress
      .addCase(fetchProjectProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProgress = action.payload;
      })
      .addCase(fetchProjectProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || t('progressLoadFailed');
      })
      // Update Milestone
      .addCase(updateMilestone.fulfilled, (state, action) => {
        state.currentProgress = action.payload;
      })
      // Submit Project
      .addCase(submitProject.fulfilled, (state, action) => {
        state.currentProgress = action.payload;
      });
  },
});

export const { clearCurrentProgress } = progressSlice.actions;
export default progressSlice.reducer;
