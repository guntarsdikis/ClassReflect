/**
 * Job Status Polling Service
 * Provides real-time progress tracking for upload/transcription/analysis jobs
 */

export interface JobStatusProgress {
  stage: 'queued' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  percent: number;
  message: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: string;
  analysisStatus?: string;
  progress: JobStatusProgress;
  transcription: {
    completed: boolean;
    hasText: boolean;
  };
  analysis: {
    completed: boolean;
    jobId?: string;
    templateName?: string;
  };
  error?: string;
}

class JobStatusService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  /**
   * Get current status of a job
   */
  async getJobStatus(jobId: string, token: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Poll job status until completion or failure
   * Calls onUpdate callback with each status update
   */
  async pollUntilComplete(
    jobId: string,
    token: string,
    onUpdate: (status: JobStatusResponse) => void,
    options: {
      pollInterval?: number; // milliseconds
      maxAttempts?: number;
    } = {}
  ): Promise<JobStatusResponse> {
    const pollInterval = options.pollInterval || 2000; // 2 seconds default
    const maxAttempts = options.maxAttempts || 300; // 10 minutes max

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;

          if (attempts > maxAttempts) {
            reject(new Error('Polling timeout - job took too long'));
            return;
          }

          const status = await this.getJobStatus(jobId, token);
          onUpdate(status);

          // Check if we should stop polling
          if (status.progress.stage === 'completed' || status.progress.stage === 'failed') {
            resolve(status);
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);

        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }
}

export const jobStatusService = new JobStatusService();