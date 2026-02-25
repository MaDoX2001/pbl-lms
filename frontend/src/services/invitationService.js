import axios from 'axios';
import { translate as t } from '../i18n/translate';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const invitationService = {
  // Request invitation
  requestInvitation: async (email, name, role, password) => {
    try {
      const response = await axios.post(`${API_URL}/invitations/request`, {
        email,
        name,
        role,
        password
      });
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || t('invitationRequestSendError');
      throw { message: errorMsg };
    }
  },

  // Check request status
  checkRequestStatus: async (email) => {
    try {
      const response = await axios.get(`${API_URL}/invitations/check-status`, {
        params: { email }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all invitation requests (Admin)
  getAllRequests: async (status, role, page = 1, limit = 10) => {
    try {
      const response = await axios.get(`${API_URL}/invitations/admin/all`, {
        params: { status, role, page, limit },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get invitation request by ID
  getRequestById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/invitations/admin/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Approve invitation request
  approveRequest: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/invitations/admin/${id}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reject invitation request
  rejectRequest: async (id, reason) => {
    try {
      const response = await axios.post(`${API_URL}/invitations/admin/${id}/reject`,
        { reason },
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

export default invitationService;
