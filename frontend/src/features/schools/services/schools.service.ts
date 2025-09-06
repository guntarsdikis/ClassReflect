import { ApiClient } from '@shared/services/api.client';

export interface School {
  id: number;
  name: string;
  domain?: string;
  contact_email: string;
  is_active: boolean;
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
  is_active?: boolean;
  max_teachers?: number;
  max_monthly_uploads?: number;
}

export interface UpdateSchoolRequest extends Partial<CreateSchoolRequest> {}

export interface TemplateCategory {
  id: number;
  category_name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  template_count: number;
}

export interface CreateTemplateCategoryRequest {
  category_name: string;
  description?: string;
  color?: string;
}

export interface UpdateTemplateCategoryRequest {
  category_name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

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
   * Get school's template categories
   */
  async getSchoolTemplateCategories(schoolId: number): Promise<TemplateCategory[]> {
    return this.api.get<TemplateCategory[]>(`/schools/${schoolId}/template-categories`);
  }

  /**
   * Create template category for school
   */
  async createSchoolTemplateCategory(schoolId: number, data: CreateTemplateCategoryRequest): Promise<{
    id: number;
    schoolId: number;
    category_name: string;
    description?: string;
    color?: string;
    message: string;
  }> {
    return this.api.post(`/schools/${schoolId}/template-categories`, data);
  }

  /**
   * Update template category for school
   */
  async updateSchoolTemplateCategory(schoolId: number, categoryId: number, data: UpdateTemplateCategoryRequest): Promise<{
    id: number;
    message: string;
  }> {
    return this.api.put(`/schools/${schoolId}/template-categories/${categoryId}`, data);
  }

  /**
   * Delete template category for school
   */
  async deleteSchoolTemplateCategory(schoolId: number, categoryId: number): Promise<{
    id: number;
    message: string;
  }> {
    return this.api.delete(`/schools/${schoolId}/template-categories/${categoryId}`);
  }

  /**
   * Import Teach Like a Champion templates to school (SuperAdmin only)
   */
  async importTLCTemplates(schoolId: number): Promise<{
    message: string;
    school: { id: number; name: string };
    imported: Array<{ id: number; name: string; criteriaCount: number }>;
    categoryCreated: boolean;
  }> {
    return this.api.post(`/schools/${schoolId}/import-tlc-templates`);
  }
}

// Export singleton instance
export const schoolsService = SchoolsService.getInstance();