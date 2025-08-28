/**
 * AssemblyAI Processing Service
 * Handles audio transcription using AssemblyAI API
 */

import pool from '../database';
import { assemblyAIService } from './assemblyai';


export interface AudioJobData {
  jobId: string;
  teacherId: number;
  schoolId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
}

/**
 * AssemblyAI Processing Service
 */
class AssemblyAIProcessingService {
  constructor() {
    // AssemblyAI service is configured globally
  }

  async enqueueJob(jobData: AudioJobData): Promise<void> {
    console.log(`🎙️ Processing job ${jobData.jobId} with AssemblyAI`);
    
    // Process immediately using AssemblyAI
    this.processJob(jobData.jobId).catch(error => {
      console.error(`Failed to process job ${jobData.jobId}:`, error);
      this.markJobFailed(jobData.jobId, error.message);
    });
  }

  async processJob(jobId: string): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI processing for job ${jobId}`);
      
      await assemblyAIService.transcribeJob(jobId);
      console.log(`✅ Job ${jobId} completed successfully`);

    } catch (error: any) {
      console.error(`❌ Job ${jobId} failed:`, error);
      await this.markJobFailed(jobId, error.message);
    }
  }


  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await pool.execute(
      'UPDATE audio_jobs SET status = ?, error_message = ?, processing_completed_at = NOW() WHERE id = ?',
      ['failed', errorMessage, jobId]
    );
  }

}

// Export singleton instance
export const processingService = new AssemblyAIProcessingService();
export { AssemblyAIProcessingService };