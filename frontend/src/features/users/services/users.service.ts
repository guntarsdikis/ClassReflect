import { ApiClient } from '@shared/services/api.client';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  schoolId?: number;
  schoolName?: string;
  subjects?: string[];
  grades?: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface CreateTeacherRequest {
  email: string;
  firstName: string;
  lastName: string;
  subjects?: string[];
  grades?: string[];
  schoolId?: number; // For super admin creating teachers in specific schools
  sendInviteEmail?: boolean;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_manager';
  schoolId?: number; // Required for both roles
  subjects?: string[]; // Only for teachers
  grades?: string[]; // Only for teachers
  sendInviteEmail?: boolean;
}

export interface CreateSchoolManagerRequest {
  schoolName: string;
  domain?: string;
  subscriptionTier?: 'basic' | 'professional' | 'enterprise';
  managerEmail: string;
  managerFirstName: string;
  managerLastName: string;
}

export interface UpdateTeacherRequest {
  subjects?: string[];
  grades?: string[];
  isActive?: boolean;
  schoolId?: number; // Super Admin only - to reassign teachers to different schools
}

export interface UpdateUserRoleRequest {
  role: 'teacher' | 'school_manager';
  schoolId?: number; // Required when promoting to school_manager
}

export interface BulkCreateTeachersRequest {
  teachers: CreateTeacherRequest[];
}

export interface BulkCreateResult {
  message: string;
  successful: number;
  failed: number;
  total: number;
  results: Array<{
    index: number;
    teacherId?: number;
    email: string;
    success: boolean;
    error?: string;
  }>;
  errors: Array<{
    index: number;
    email: string;
    error: string;
  }>;
}

export class UsersService {
  private static instance: UsersService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService();
    }
    return UsersService.instance;
  }

  /**
   * Get all users (Super Admin only)
   */
  async getAllUsers(): Promise<User[]> {
    return this.api.get<User[]>('/users');
  }

  /**
   * Get all teachers (filtered by school for managers, all for super admin)
   */
  async getTeachers(schoolId?: number): Promise<User[]> {
    const params = schoolId ? { schoolId } : {};
    return this.api.get<User[]>('/users/teachers', params);
  }

  /**
   * Create a single teacher account
   */
  async createTeacher(data: CreateTeacherRequest): Promise<{
    message: string;
    teacherId: number;
    email: string;
    temporaryPassword?: string;
    cognitoUsername: string;
  }> {
    return this.api.post('/users/teachers', data);
  }

  /**
   * Create user with role selection (Super Admin only)
   */
  async createUser(data: CreateUserRequest): Promise<{
    message: string;
    userId: number;
    email: string;
    temporaryPassword?: string;
    cognitoUsername: string;
  }> {
    return this.api.post('/users', data);
  }

  /**
   * Bulk create teacher accounts
   */
  async bulkCreateTeachers(data: BulkCreateTeachersRequest): Promise<BulkCreateResult> {
    return this.api.post('/users/teachers/bulk', data);
  }

  /**
   * Update teacher details
   */
  async updateTeacher(teacherId: number, data: UpdateTeacherRequest): Promise<{ message: string }> {
    return this.api.put(`/users/teachers/${teacherId}`, data);
  }

  /**
   * Reset teacher password (Admin only)
   */
  async resetTeacherPassword(teacherId: number): Promise<{
    message: string;
    temporaryPassword: string;
    teacherEmail: string;
    teacherName: string;
    requiresPasswordChange: boolean;
  }> {
    return this.api.post(`/users/teachers/${teacherId}/reset-password`, {});
  }

  /**
   * Update user role (Super Admin only)
   */
  async updateUserRole(userId: number, data: UpdateUserRoleRequest): Promise<{ message: string }> {
    return this.api.patch(`/users/${userId}/role`, data);
  }

  /**
   * Delete/deactivate teacher
   */
  async deleteTeacher(teacherId: number): Promise<{ 
    message: string; 
    deleted?: boolean; 
    deactivated?: boolean; 
  }> {
    return this.api.delete(`/users/teachers/${teacherId}`);
  }

  /**
   * Create school with manager (Super Admin only)
   */
  async createSchoolWithManager(data: CreateSchoolManagerRequest): Promise<{
    message: string;
    schoolId: number;
    managerId: number;
    managerEmail: string;
    temporaryPassword: string;
    cognitoUsername: string;
  }> {
    return this.api.post('/users/admin/schools', data);
  }


  /**
   * Get user statistics for dashboard
   */
  async getUserStats(): Promise<{
    totalTeachers: number;
    activeTeachers: number;
    totalManagers: number;
    recentlyCreated: number;
  }> {
    // This would need a dedicated endpoint, for now we'll calculate from teachers
    const users = await this.getAllUsers();
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalTeachers: users.filter(u => u.role === 'teacher').length,
      activeTeachers: users.filter(u => u.role === 'teacher' && u.isActive).length,
      totalManagers: users.filter(u => u.role === 'school_manager').length,
      recentlyCreated: users.filter(u => new Date(u.createdAt) > oneWeekAgo).length,
    };
  }
}

// Export singleton instance
export const usersService = UsersService.getInstance();