import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Add token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      useAuthStore.getState().login(token, user);
      return { success: true, user };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  },

  async logout() {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      useAuthStore.getState().logout();
    }
  },

  async forgotPassword(email: string) {
    try {
      await axios.post('/api/auth/forgot-password', { email });
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to send reset email' 
      };
    }
  },

  async validateToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await axios.get('/api/auth/validate');
      if (response.data.valid) {
        return true;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
    }
    
    useAuthStore.getState().logout();
    return false;
  }
};