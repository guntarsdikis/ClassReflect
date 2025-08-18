import axios, { AxiosInstance, AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@store/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      apiClient.post('/api/auth/login', { email, password }),
    
    logout: () =>
      apiClient.post('/api/auth/logout'),
    
    forgotPassword: (email: string) =>
      apiClient.post('/api/auth/forgot-password', { email }),
    
    resetPassword: (token: string, password: string) =>
      apiClient.post('/api/auth/reset-password', { token, password }),
  },
  
  // User management (School Manager only)
  users: {
    getProfile: () =>
      apiClient.get('/api/users/profile'),
    
    getTeachers: () =>
      apiClient.get('/api/users/teachers'),
    
    createTeacher: (data: {
      email: string;
      firstName: string;
      lastName: string;
      subjects: string[];
      grades: string[];
    }) =>
      apiClient.post('/api/users/teachers', data),
    
    updateTeacher: (id: string, data: Partial<{
      subjects: string[];
      grades: string[];
      isActive: boolean;
    }>) =>
      apiClient.put(`/api/users/teachers/${id}`, data),
    
    bulkCreateTeachers: (teachers: Array<{
      email: string;
      firstName: string;
      lastName: string;
      subjects: string[];
      grades: string[];
    }>) =>
      apiClient.post('/api/users/teachers/bulk', { teachers }),
  },
  
  // School management (Super Admin only)
  admin: {
    createSchool: (data: {
      schoolName: string;
      domain: string;
      subscriptionTier: 'basic' | 'professional' | 'enterprise';
      managerEmail: string;
      managerFirstName: string;
      managerLastName: string;
    }) =>
      apiClient.post('/api/admin/schools', data),
    
    getSchools: () =>
      apiClient.get('/api/admin/schools'),
    
    updateSchool: (id: string, data: Partial<{
      subscriptionTier: string;
      isActive: boolean;
      maxTeachers: number;
      maxMonthlyUploads: number;
    }>) =>
      apiClient.put(`/api/admin/schools/${id}`, data),
  },
  
  // Upload endpoints (School Manager only)
  upload: {
    uploadRecording: (formData: FormData, onProgress?: (progress: number) => void) =>
      apiClient.post('/api/upload/recording', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }),
    
    getTemplates: (params?: { grade?: string; subject?: string; curriculum?: string }) =>
      apiClient.get('/api/upload/templates', { params }),
  },
  
  // Jobs and results
  jobs: {
    getTeacherJobs: (teacherId: string) =>
      apiClient.get(`/api/jobs/teacher/${teacherId}`),
    
    getJobStatus: (jobId: string) =>
      apiClient.get(`/api/jobs/${jobId}`),
    
    getJobResult: (jobId: string) =>
      apiClient.get(`/api/jobs/${jobId}/result`),
  },
  
  // Analytics
  analytics: {
    getTeacherAnalytics: (teacherId: string, params?: { startDate?: string; endDate?: string }) =>
      apiClient.get(`/api/analytics/teacher/${teacherId}`, { params }),
    
    getSchoolAnalytics: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get('/api/analytics/school', { params }),
  },
  
  // Templates (School Manager)
  templates: {
    getTemplates: (params?: { category?: string; subject?: string; grade?: string }) =>
      apiClient.get('/api/templates', { params }),
    
    getTemplate: (id: string) =>
      apiClient.get(`/api/templates/${id}`),
    
    createTemplate: (data: {
      templateName: string;
      category: string;
      gradeLevels: string[];
      subjectAreas: string[];
      criteria: any;
      baseTemplateId?: string;
    }) =>
      apiClient.post('/api/templates', data),
    
    updateTemplate: (id: string, data: Partial<{
      criteria: any;
      isActive: boolean;
    }>) =>
      apiClient.put(`/api/templates/${id}`, data),
  },
};