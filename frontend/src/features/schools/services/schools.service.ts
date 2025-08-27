import { ApiClient } from '@shared/services/api.client';

export interface School {
  id: number;
  name: string;
  domain?: string;
  contact_email: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_expires: string;
  max_teachers: number;
  max_monthly_uploads: number;
  total_teachers?: number;
  total_uploads?: number;
  monthly_uploads?: number;
  processing_jobs?: number;
  manager_first_name?: string;
  manager_last_name?: string;
  manager_email?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSchoolRequest {
  name: string;
  domain?: string;
  contact_email: string;
  subscription_status?: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_expires?: string;
  max_teachers?: number;
  max_monthly_uploads?: number;
}

export interface UpdateSchoolRequest extends Partial<CreateSchoolRequest> {}

export interface PlatformStats {
  total_schools: number;
  total_users: number;
  processing_jobs: number;
  active_schools: number;
  trial_schools: number;
  expired_schools: number;
}

export interface PlatformActivity {
  type: 'school_created' | 'user_created' | 'subscription_expired';
  school_name: string;
  school_id: number;
  status: string;
  timestamp: string;
  manager_name?: string;
}

export class SchoolsService {
  private static instance: SchoolsService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): SchoolsService {
    if (!SchoolsService.instance) {
      SchoolsService.instance = new SchoolsService();
    }
    return SchoolsService.instance;
  }

  /**
   * Get all schools (SuperAdmin only)
   */
  async getAllSchools(): Promise<School[]> {
    return this.api.get<School[]>('/schools');
  }

  /**
   * Get single school with detailed stats
   */
  async getSchool(schoolId: number): Promise<School> {
    return this.api.get<School>(`/schools/${schoolId}`);
  }

  /**
   * Create new school (SuperAdmin only)
   */
  async createSchool(data: CreateSchoolRequest): Promise<School> {
    return this.api.post<School>('/schools', data);
  }

  /**
   * Update school (SuperAdmin only)
   */
  async updateSchool(schoolId: number, data: UpdateSchoolRequest): Promise<{ message: string }> {
    return this.api.put(`/schools/${schoolId}`, data);
  }

  /**
   * Suspend school (SuperAdmin only)
   */
  async suspendSchool(schoolId: number): Promise<{ message: string }> {
    return this.api.delete(`/schools/${schoolId}`);
  }

  /**
   * Get platform statistics (SuperAdmin only)
   */
  async getPlatformStats(): Promise<PlatformStats> {
    return this.api.get<PlatformStats>('/schools/admin/stats');
  }

  /**
   * Get recent platform activity (SuperAdmin only)
   */
  async getPlatformActivity(): Promise<PlatformActivity[]> {
    return this.api.get<PlatformActivity[]>('/schools/admin/activity');
  }

  /**
   * Get school's analysis criteria
   */
  async getSchoolCriteria(schoolId: number): Promise<any[]> {
    return this.api.get<any[]>(`/schools/${schoolId}/criteria`);
  }

  /**
   * Add analysis criterion to school
   */
  async addSchoolCriterion(schoolId: number, data: {
    criteria_name: string;
    criteria_description?: string;
    weight?: number;
  }): Promise<any> {
    return this.api.post(`/schools/${schoolId}/criteria`, data);
  }
}

// Export singleton instance
export const schoolsService = SchoolsService.getInstance();