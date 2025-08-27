import { ApiClient } from '@shared/services/api.client';

export interface TemplateCriterion {
  id?: number;
  template_id?: number;
  criteria_id?: number;
  criteria_name: string;
  criteria_description?: string;
  weight: number;
  is_active?: boolean;
  order_index?: number;
  created_at?: string;
}

export interface Template {
  id: number;
  template_name: string;
  description?: string;
  category: string;
  grade_levels: string[];
  subjects: string[];
  is_global: boolean;
  school_id?: number;
  school_name?: string;
  created_by: number;
  created_by_first_name?: string;
  created_by_last_name?: string;
  is_active: boolean;
  usage_count: number;
  criteria_count?: number;
  criteria?: TemplateCriterion[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  template_name: string;
  description?: string;
  category: string;
  grade_levels?: string[];
  subjects?: string[];
  is_global?: boolean;
  school_id?: number;
  criteria?: Omit<TemplateCriterion, 'id' | 'template_id' | 'created_at'>[];
}

export interface UpdateTemplateRequest extends Partial<Omit<CreateTemplateRequest, 'criteria'>> {}

export interface TemplateFilters {
  category?: string;
  subject?: string;
  grade?: string;
}

export interface TemplateCategories {
  categories: string[];
  usage: Array<{
    category: string;
    template_count: number;
  }>;
}

export interface ApplyTemplateResponse {
  message: string;
  criteriaAdded: number;
  totalCriteria: number;
}

export class TemplatesService {
  private static instance: TemplatesService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): TemplatesService {
    if (!TemplatesService.instance) {
      TemplatesService.instance = new TemplatesService();
    }
    return TemplatesService.instance;
  }

  /**
   * Get all templates accessible to the current user
   */
  async getTemplates(filters?: TemplateFilters): Promise<Template[]> {
    return this.api.get<Template[]>('/templates', filters);
  }

  /**
   * Get single template with detailed criteria
   */
  async getTemplate(templateId: number): Promise<Template> {
    return this.api.get<Template>(`/templates/${templateId}`);
  }

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<{
    id: number;
    template_name: string;
    message: string;
  }> {
    return this.api.post('/templates', data);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: number, data: UpdateTemplateRequest): Promise<{ message: string }> {
    return this.api.put(`/templates/${templateId}`, data);
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(templateId: number): Promise<{ message: string }> {
    return this.api.delete(`/templates/${templateId}`);
  }

  /**
   * Get available template categories
   */
  async getTemplateCategories(): Promise<TemplateCategories> {
    return this.api.get<TemplateCategories>('/templates/meta/categories');
  }

  /**
   * Apply a template to a school (copies criteria to analysis_criteria)
   */
  async applyTemplate(templateId: number, schoolId?: number): Promise<ApplyTemplateResponse> {
    return this.api.post(`/templates/${templateId}/apply`, schoolId ? { school_id: schoolId } : {});
  }

  /**
   * Get template statistics for dashboard
   */
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    globalTemplates: number;
    schoolTemplates: number;
    popularCategories: Array<{
      category: string;
      count: number;
    }>;
  }> {
    const templates = await this.getTemplates();
    const categories: Record<string, number> = {};

    templates.forEach(template => {
      categories[template.category] = (categories[template.category] || 0) + 1;
    });

    const popularCategories = Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTemplates: templates.length,
      globalTemplates: templates.filter(t => t.is_global).length,
      schoolTemplates: templates.filter(t => !t.is_global).length,
      popularCategories,
    };
  }

  /**
   * Get common subjects for dropdown
   */
  getCommonSubjects(): string[] {
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
      'Earth Science',
      'Art',
      'Music',
      'Physical Education',
      'Health',
      'Computer Science',
      'Technology',
      'World Languages',
      'Spanish',
      'French',
      'Other'
    ];
  }

  /**
   * Get common grade levels for dropdown
   */
  getGradeLevels(): string[] {
    return ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }

  /**
   * Get default template categories
   */
  getDefaultCategories(): string[] {
    return [
      'General Teaching',
      'Subject-Specific',
      'Assessment',
      'Classroom Management',
      'Student Engagement',
      'Professional Development',
      'Special Education',
      'Technology Integration',
      'Other'
    ];
  }
}

// Export singleton instance
export const templatesService = TemplatesService.getInstance();