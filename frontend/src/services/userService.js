import api from './api';

// Get current user profile
export const getMyProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Update password
export const updatePassword = async (passwordData) => {
  const response = await api.put('/auth/updatepassword', passwordData);
  return response.data;
};

// Update user profile
export const updateProfile = async (userId, profileData) => {
  const response = await api.put(`/users/${userId}`, profileData);
  return response.data;
};

// Calculate profile completion percentage
export const calculateProfileCompletion = (user) => {
  if (!user) return 0;

  const fields = [
    { key: 'name', weight: 20 },
    { key: 'email', weight: 20 },
    { key: 'bio', weight: 15 },
    { key: 'avatar', weight: 15 },
    { key: 'skills', weight: 15, isArray: true },
    { key: 'twoFactorEnabled', weight: 15 }
  ];

  let totalWeight = 0;
  let completedWeight = 0;

  fields.forEach(field => {
    totalWeight += field.weight;
    
    if (field.isArray) {
      if (user[field.key] && user[field.key].length > 0) {
        completedWeight += field.weight;
      }
    } else {
      if (user[field.key]) {
        completedWeight += field.weight;
      }
    }
  });

  return Math.round((completedWeight / totalWeight) * 100);
};

export default {
  getMyProfile,
  updatePassword,
  updateProfile,
  calculateProfileCompletion
};
