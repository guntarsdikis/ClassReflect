import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '@shared/services/api.client';
import { useAuthStore, type User } from '@store/auth.store';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

// Login hook
export const useLogin = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.auth.login(credentials.email, credentials.password);
      return response.data as LoginResponse;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      
      notifications.show({
        title: 'Welcome back!',
        message: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
        color: 'green',
      });
      
      // Redirect based on role
      switch (data.user.role) {
        case 'super_admin':
          navigate('/admin');
          break;
        case 'school_manager':
          navigate('/dashboard');
          break;
        case 'teacher':
          navigate('/dashboard');
          break;
        default:
          navigate('/');
      }
    },
    onError: (error: any) => {
      // Error notification handled by API client interceptor
      console.error('Login error:', error);
    },
  });
};

// Logout hook
export const useLogout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  
  return useMutation({
    mutationFn: async () => {
      await api.auth.logout();
    },
    onSuccess: () => {
      logout();
      navigate('/login');
      notifications.show({
        title: 'Logged out',
        message: 'You have been successfully logged out.',
        color: 'blue',
      });
    },
    onError: () => {
      // Even if logout fails on server, clear local state
      logout();
      navigate('/login');
    },
  });
};

// Forgot password hook
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await api.auth.forgotPassword(email);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Email sent',
        message: 'Password reset instructions have been sent to your email.',
        color: 'green',
      });
    },
  });
};

// Reset password hook
export const useResetPassword = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await api.auth.resetPassword(token, password);
      return response.data;
    },
    onSuccess: () => {
      notifications.show({
        title: 'Password reset',
        message: 'Your password has been successfully reset. Please log in.',
        color: 'green',
      });
      navigate('/login');
    },
  });
};