import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { translate as t } from '../../i18n/translate';

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/projects?${params}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      return response.data.data;
    } catch (error) {
      toast.error(t('projectLoadFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await api.post('/projects', projectData);
      toast.success(t('projectCreateSuccess'));
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectCreateFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/projects/${projectId}`, data);
      toast.success(t('projectUpdateSuccess'));
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectUpdateFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

export const enrollInProject = createAsyncThunk(
  'projects/enrollInProject',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/projects/${projectId}/enroll`);
      toast.success(t('projectEnrollSuccess'));
      return { projectId, data: response.data };
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectEnrollFailed'));
      return rejectWithValue(error.response?.data);
    }
  }
);

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || t('projectsLoadFailed');
      })
      // Fetch Project By ID
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || t('projectLoadFailed');
      })
      // Create Project
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.unshift(action.payload);
      })
      // Update Project
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.currentProject?._id === action.payload._id) {
          state.currentProject = action.payload;
        }
      })
      // Enroll In Project
      .addCase(enrollInProject.fulfilled, (state, action) => {
        if (state.currentProject?._id === action.payload.projectId) {
          // Update enrollment status
          state.currentProject.isEnrolled = true;
        }
      });
  },
});

export const { clearCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;
