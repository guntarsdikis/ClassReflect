import axios, { AxiosInstance, AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@store/auth.store';

const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    // Allow callers to suppress global error toasts for background/polling requests
    const cfg: any = error.config || {};
    const isSilent = cfg.headers?.['X-Silent'] === '1' || cfg.params?.silent === 1 || cfg.params?.silent === '1';
    if (isSilent) {
      return Promise.reject(error);
    }
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      notifications.show({
        title: 'Session Expired',
        message: 'Please log in again to continue.',
        color: 'yellow',
      });
    } 
    // Handle other errors
    else if (error.response?.status === 403) {
      notifications.show({
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        color: 'red',
      });
    } 
    else if (error.response && error.response.status >= 500) {
      notifications.show({
        title: 'Server Error',
        message: 'Something went wrong. Please try again later.',
        color: 'red',
      });
    } 
    else if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } 
    else if (error.request) {
      notifications.show({
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your connection.',
        color: 'red',
      });
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    
    completeChallenge: (username: string, newPassword: string, temporaryPassword: string) =>
      apiClient.post('/auth/complete-challenge', { username, newPassword, temporaryPassword }),
    
    logout: () =>
      apiClient.post('/auth/logout'),
    
    forgotPassword: (email: string) =>
      apiClient.post('/auth/forgot-password', { email }),
    
    resetPassword: (token: string, password: string) =>
      apiClient.post('/auth/reset-password', { token, password }),
  },
  
  // User management
  users: {
    getProfile: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },
    
    updateProfile: async (data: { firstName: string; lastName: string; email: string }) => {
      const response = await apiClient.put('/auth/profile', data);
      return response.data;
    },
    // Keep profile-only methods here; prefer typed services for user CRUD.
  },
};

// Generic API Client class for services
export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = apiClient;
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export default apiClient;
