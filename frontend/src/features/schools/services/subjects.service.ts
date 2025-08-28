import { ApiClient } from '@shared/services/api.client';

export interface SchoolSubject {
  id: number;
  school_id?: number;
  subject_name: string;
  description?: string;
  category?: string;
  category_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
}

export interface SchoolCategory {
  id: number;
  category_name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  subject_count: number;
}

export interface CreateSubjectRequest {
  subject_name: string;
  description?: string;
  category?: string;
  category_id?: number;
}

export interface UpdateSubjectRequest {
  subject_name?: string;
  description?: string;
  category?: string;
  category_id?: number;
  is_active?: boolean;
}

export interface CreateCategoryRequest {
  category_name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  category_name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export class SubjectsService {
  private static instance: SubjectsService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): SubjectsService {
    if (!SubjectsService.instance) {
      SubjectsService.instance = new SubjectsService();
    }
    return SubjectsService.instance;
  }

  /**
   * Get all subjects for a school
   */
  async getSchoolSubjects(schoolId: number): Promise<SchoolSubject[]> {
    return this.api.get<SchoolSubject[]>(`/schools/${schoolId}/subjects`);
  }

  /**
   * Create a new subject for a school
   */
  async createSubject(schoolId: number, data: CreateSubjectRequest): Promise<{
    id: number;
    schoolId: number;
    subject_name: string;
    description?: string;
    message: string;
  }> {
    return this.api.post(`/schools/${schoolId}/subjects`, data);
  }

  /**
   * Update an existing subject
   */
  async updateSubject(schoolId: number, subjectId: number, data: UpdateSubjectRequest): Promise<{
    id: number;
    schoolId: number;
    message: string;
  }> {
    return this.api.put(`/schools/${schoolId}/subjects/${subjectId}`, data);
  }

  /**
   * Delete a subject (soft delete)
   */
  async deleteSubject(schoolId: number, subjectId: number): Promise<{
    id: number;
    schoolId: number;
    message: string;
  }> {
    return this.api.delete(`/schools/${schoolId}/subjects/${subjectId}`);
  }

  /**
   * Get all categories for a school
   */
  async getSchoolCategories(schoolId: number): Promise<SchoolCategory[]> {
    return this.api.get<SchoolCategory[]>(`/schools/${schoolId}/categories`);
  }

  /**
   * Create a new category for a school
   */
  async createCategory(schoolId: number, data: CreateCategoryRequest): Promise<{
    id: number;
    schoolId: number;
    category_name: string;
    description?: string;
    color?: string;
    message: string;
  }> {
    return this.api.post(`/schools/${schoolId}/categories`, data);
  }

  /**
   * Update an existing category
   */
  async updateCategory(schoolId: number, categoryId: number, data: UpdateCategoryRequest): Promise<{
    id: number;
    message: string;
  }> {
    return this.api.put(`/schools/${schoolId}/categories/${categoryId}`, data);
  }

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(schoolId: number, categoryId: number): Promise<{
    id: number;
    message: string;
  }> {
    return this.api.delete(`/schools/${schoolId}/categories/${categoryId}`);
  }

  /**
   * Get default/recommended subjects for testing purposes
   */
  getDefaultSubjects(): string[] {
    return [
      'Mathematics',
      'English Language Arts',
      'Science',
      'Social Studies',
      'History',
      'Geography',
      'Biology',
      'Chemistry',
      'Physics',
      'Art',
      'Music',
      'Physical Education',
      'Health',
      'Computer Science',
      'Technology'
    ];
  }
}

// Export singleton instance
export const subjectsService = SubjectsService.getInstance();