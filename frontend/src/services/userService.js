import api from './api';

// Get current user profile
export const getMyProfile = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

// Update current user profile
export const updateMyProfile = async (profileData) => {
  const response = await api.put('/users/me', profileData);
  return response.data;
};

// Update password
export const updatePassword = async (passwordData) => {
  const response = await api.put('/auth/updatepassword', passwordData);
  return response.data;
};

export default {
  getMyProfile,
  updateMyProfile,
  updatePassword
};
