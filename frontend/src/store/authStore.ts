import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'teacher' | 'school_manager' | 'super_admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId: string;
  schoolName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (token: string, user: User) => {
        localStorage.setItem('token', token);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        window.location.href = '/login';
      },
      
      checkAuth: () => {
        const token = localStorage.getItem('token');
        if (!token) {
          get().logout();
          return false;
        }
        // In production, validate token expiry here
        return true;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);