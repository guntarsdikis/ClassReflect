import { ApiClient } from '@shared/services/api.client';

export interface RecordingForAnalysis {
  job_id: string;
  teacher_id: number;
  class_name: string;
  subject: string;
  grade: string;
  class_duration_minutes: number;
  notes: string;
  file_name: string;
  uploaded_at: string;
  teacher_first_name: string;
  teacher_last_name: string;
  transcript_id: number;
  transcript_text: string;
  word_count: number;
  confidence_score: number;
  has_analysis: number;
  analysis_count: number;
}

export interface AnalysisResult {
  id: number;
  transcript_id: number;
  job_id: string;
  teacher_id: number;
  school_id: number;
  template_id: number;
  applied_by: number;
  overall_score: number;
  strengths: string[];
  improvements: string[];
  detailed_feedback: Record<string, {
    score: number;
    feedback: string;
  }>;
  ai_model: string;
  created_at: string;
  template_name?: string;
  template_description?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  applied_by_first_name?: string;
  applied_by_last_name?: string;
  class_name?: string;
  subject?: string;
  grade?: string;
  file_name?: string;
}

export interface ApplyTemplateRequest {
  transcriptId: number;
  templateId: number;
}

export interface ApplyTemplateResponse {
  analysisId: number;
  message: string;
  results: {
    overall_score: number;
    strengths: string[];
    improvements: string[];
    detailed_feedback: Record<string, {
      score: number;
      feedback: string;
    }>;
  };
}

export interface SchoolAnalysisSummary {
  summary: {
    total_analyses: number;
    average_score: number;
    min_score: number;
    max_score: number;
    teachers_analyzed: number;
  };
  recentAnalyses: Array<{
    id: number;
    overall_score: number;
    created_at: string;
    template_name: string;
    teacher_first_name: string;
    teacher_last_name: string;
    class_name: string;
    subject: string;
  }>;
  templateUsage: Array<{
    template_name: string;
    usage_count: number;
    average_score: number;
  }>;
}

export class AnalysisService {
  private static instance: AnalysisService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  /**
   * Get recordings available for analysis
   */
  async getRecordingsForAnalysis(schoolId?: number): Promise<RecordingForAnalysis[]> {
    const params = schoolId ? { schoolId } : {};
    return this.api.get<RecordingForAnalysis[]>('/analysis/recordings', params);
  }

  /**
   * Apply a template to analyze a recording
   */
  async applyTemplate(data: ApplyTemplateRequest): Promise<ApplyTemplateResponse> {
    return this.api.post<ApplyTemplateResponse>('/analysis/apply-template', data);
  }

  /**
   * Get analysis results for a transcript
   */
  async getAnalysisResults(transcriptId: number): Promise<AnalysisResult[]> {
    return this.api.get<AnalysisResult[]>(`/analysis/results/${transcriptId}`);
  }

  /**
   * Get school analysis summary
   */
  async getSchoolSummary(schoolId?: number): Promise<SchoolAnalysisSummary> {
    const params = schoolId ? { schoolId } : {};
    return this.api.get<SchoolAnalysisSummary>('/analysis/school-summary', params);
  }
}

// Export singleton instance
export const analysisService = AnalysisService.getInstance();