import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Assessment API endpoints
export const assessmentAPI = {
  // Observation Card
  createOrUpdateObservationCard: (data) => api.post('/assessment/observation-card', data),
  getObservationCard: (projectId) => api.get(`/assessment/observation-card/${projectId}`),
  
  // Evaluation
  createEvaluation: (data) => api.post('/assessment/evaluate', data),
  getEvaluation: (submissionId) => api.get(`/assessment/evaluation/${submissionId}`),
  getStudentAttempts: (projectId, studentId) => api.get(`/assessment/student-attempts/${projectId}/${studentId}`),
  
  // Badges
  createOrUpdateBadge: (data) => api.post('/assessment/badge', data),
  getProjectBadge: (projectId) => api.get(`/assessment/badge/${projectId}`),
  getStudentBadges: (studentId) => api.get(`/assessment/badges/${studentId}`)
};

export default api;
