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

  async enqueueJobFromS3(jobId: string): Promise<void> {
    console.log(`🎙️ Processing job ${jobId} from S3`);
    this.processJobFromS3(jobId).catch(error => {
      console.error(`Failed to process S3 job ${jobId}:`, error);
      this.markJobFailed(jobId, error.message);
    });
  }

  async processJobFromS3(jobId: string): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI processing from S3 for job ${jobId}`);

      // Fetch job to get S3 key
      const [rows] = await pool.execute(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );
      const jobs = rows as any[];
      if (!jobs.length) {
        throw new Error(`Job ${jobId} not found`);
      }
      const job = jobs[0];
      if (!job.s3_key) {
        throw new Error(`No S3 key found for job ${jobId}`);
      }

      await assemblyAIService.transcribeFromS3Key(jobId, job.s3_key);
      console.log(`✅ S3 Job ${jobId} completed successfully`);
    } catch (error: any) {
      console.error(`❌ S3 Job ${jobId} failed:`, error);
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
