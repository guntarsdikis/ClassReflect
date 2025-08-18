// Mock authentication for development
// Remove this file and use real auth in production

import { User } from '@store/auth.store';

// Mock users for testing
export const mockUsers = {
  teacher: {
    email: 'teacher@demo.com',
    password: 'teacher123',
    user: {
      id: '1',
      email: 'teacher@demo.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'teacher' as const,
      schoolId: 'school-1',
      schoolName: 'Lincoln Elementary School',
      subjects: ['Math', 'Science'],
      grades: ['3', '4'],
    },
  },
  manager: {
    email: 'manager@demo.com',
    password: 'manager123',
    user: {
      id: '2',
      email: 'manager@demo.com',
      firstName: 'Michael',
      lastName: 'Roberts',
      role: 'school_manager' as const,
      schoolId: 'school-1',
      schoolName: 'Lincoln Elementary School',
    },
  },
  admin: {
    email: 'admin@demo.com',
    password: 'admin123',
    user: {
      id: '3',
      email: 'admin@demo.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'super_admin' as const,
      schoolId: 'platform',
      schoolName: 'ClassReflect Platform',
    },
  },
};

export const mockLogin = async (email: string, password: string): Promise<{ token: string; user: User } | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check credentials
  for (const mockUser of Object.values(mockUsers)) {
    if (mockUser.email === email && mockUser.password === password) {
      // Generate a fake JWT token
      const token = `mock-jwt-token-${Date.now()}`;
      return { token, user: mockUser.user };
    }
  }
  
  return null;
};