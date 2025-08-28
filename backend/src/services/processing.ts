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
  filePath?: string; // Optional for S3-based uploads
  fileSize: number;
  contentType: string;
  audioBuffer?: Buffer; // Optional for direct buffer uploads
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
    this.processJob(jobData.jobId, jobData.audioBuffer).catch(error => {
      console.error(`Failed to process job ${jobData.jobId}:`, error);
      this.markJobFailed(jobData.jobId, error.message);
    });
  }

  async processJob(jobId: string, audioBuffer?: Buffer): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI processing for job ${jobId}`);
      
      if (!audioBuffer) {
        throw new Error(`No audio buffer provided for job ${jobId} - S3 support removed`);
      }

      // Direct buffer transcription only
      await assemblyAIService.transcribeBuffer(jobId, audioBuffer);
      
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