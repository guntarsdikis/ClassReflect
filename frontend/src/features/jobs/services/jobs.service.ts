import { ApiClient } from '@shared/services/api.client';

export interface TeacherJob {
  id: string;
  class_name: string;
  subject: string;
  grade: string;
  file_name: string;
  created_at: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  progress_percentage?: number;
  has_analysis?: number;
  analysis_count?: number;
  latest_score?: number;
  transcript_content?: string;
  word_count?: number;
  confidence_score?: number;
  teacher_name: string;
  first_name: string;
  last_name: string;
  school_name: string;
}

export interface TeacherJobsResponse {
  jobs: TeacherJob[];
  count: number;
}

export class JobsService {
  private static instance: JobsService;
  private api: ApiClient;

  private constructor() {
    this.api = new ApiClient();
  }

  public static getInstance(): JobsService {
    if (!JobsService.instance) {
      JobsService.instance = new JobsService();
    }
    return JobsService.instance;
  }

  /**
   * Get teacher's jobs/recordings
   */
  async getTeacherJobs(teacherId: string): Promise<TeacherJobsResponse> {
    return this.api.get<TeacherJobsResponse>(`/jobs/teacher/${teacherId}`);
  }

  /**
   * Get job status and details
   */
  async getJobStatus(jobId: string): Promise<TeacherJob> {
    return this.api.get<TeacherJob>(`/jobs/${jobId}`);
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<{ message: string }> {
    return this.api.delete(`/jobs/${jobId}`);
  }

  /**
   * Get school job statistics (for managers)
   */
  async getSchoolJobStats(schoolId: number): Promise<{
    total_jobs: number;
    completed_jobs: number;
    processing_jobs: number;
    failed_jobs: number;
  }> {
    return this.api.get(`/jobs/stats/${schoolId}`);
  }
}

// Export singleton instance
export const jobsService = JobsService.getInstance();