import { apiClient } from '@shared/services/api.client';

export interface Recording {
  id: string;
  teacher_id: number;
  school_id: number;
  file_name: string;
  file_size: number;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  error_message?: string;
  assemblyai_upload_url?: string;
  assemblyai_transcript_id?: string;
  // Class information
  class_name?: string;
  subject?: string;
  grade?: string;
  class_duration_minutes?: number;
  notes?: string;
  // User information
  first_name: string;
  last_name: string;
  teacher_email: string;
  school_name: string;
  transcript_id?: number;
  transcript_text?: string;
  word_count?: number;
  confidence_score?: number;
  assemblyai_external_id?: string;
  analysis_count?: number;
  latest_score?: number;
  teacher_name: string;
  has_transcript: boolean;
  file_size_mb: string | null;
}

export interface RecordingsResponse {
  recordings: Recording[];
  count: number;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface RecordingsFilters {
  status?: string;
  schoolId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class RecordingsService {
  
  /**
   * Get recordings list with filtering and pagination
   * Super admin sees all recordings, manager sees only their school's recordings
   */
  static async getRecordings(filters: RecordingsFilters = {}): Promise<RecordingsResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.set('status', filters.status);
    if (filters.schoolId) params.set('schoolId', filters.schoolId.toString());
    if (filters.search) params.set('search', filters.search);
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.offset) params.set('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = `/jobs/recordings${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<RecordingsResponse>(url);
    return response.data;
  }

  /**
   * Get short-lived playback URL for an audio job
   */
  static async getPlaybackUrl(jobId: string): Promise<{ jobId: string; fileName: string; url: string; expiresIn: number }> {
    const response = await apiClient.get(`/upload/playback-url/${jobId}`);
    return response.data;
  }

  /**
   * Get single recording details including full transcript
   */
  static async getRecording(jobId: string): Promise<Recording> {
    const response = await apiClient.get<Recording>(`/jobs/${jobId}`);
    return response.data;
  }

  /**
   * Update job status (super admin only)
   */
  static async updateJobStatus(
    jobId: string, 
    status: string, 
    errorMessage?: string
  ): Promise<{ jobId: string; status: string; message: string }> {
    const response = await apiClient.patch(`/jobs/${jobId}/status`, {
      status,
      errorMessage
    });
    return response.data;
  }

  /**
   * Get school statistics for recordings
   */
  static async getSchoolStats(schoolId: number): Promise<{
    total_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    pending_jobs: number;
    avg_processing_time: number;
  }> {
    const response = await apiClient.get(`/jobs/stats/${schoolId}`);
    return response.data;
  }

  /**
   * Delete a recording and all associated data
   */
  static async deleteRecording(jobId: string): Promise<{ message: string; deletedRecording: any }> {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  }

  /**
   * Re-run transcription for an existing recording
   * Prefers S3 if available; otherwise uses stored AssemblyAI upload URL.
   */
  static async retranscribe(jobId: string): Promise<{ jobId: string; mode: 's3' | 'assemblyai_url'; status: string; message: string }> {
    const response = await apiClient.post(`/jobs/${jobId}/retranscribe`, {});
    return response.data;
  }

  /**
   * Helper function to get status color for UI
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'processing': return 'blue';
      case 'queued': return 'orange';
      case 'uploading': return 'yellow';
      case 'pending': return 'gray';
      default: return 'gray';
    }
  }

  /**
   * Helper function to format file size
   */
  static formatFileSize(bytes: number): string {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  /**
   * Helper function to format processing time
   */
  static formatProcessingTime(startTime?: string, endTime?: string): string {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.round(diffMinutes / 60);
    return `${diffHours}h`;
  }
}

export default RecordingsService;
