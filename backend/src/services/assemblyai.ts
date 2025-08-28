/**
 * AssemblyAI Transcription Service
 * Replaces Whisper processing with AssemblyAI API
 */

import { AssemblyAI } from 'assemblyai';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { config } from '../config/environment';

export interface AssemblyAITranscriptResult {
  id: string;
  text: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  confidence: number;
  audio_duration: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

class AssemblyAIService {
  private client: AssemblyAI;

  constructor(apiKey: string) {
    this.client = new AssemblyAI({
      apiKey: apiKey
    });
  }

  /**
   * Start transcription for a job
   */
  async transcribeJob(jobId: string): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI transcription for job ${jobId}`);

      // Get job details
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );

      if (!jobRows || jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobRows[0];
      let audioUrl: string;

      // Use S3 URL for production or local file URL for development
      if (job.file_url && job.file_url.startsWith('http')) {
        // Production: use S3 URL
        audioUrl = job.file_url;
      } else if (job.s3_key) {
        // Generate S3 URL from key
        audioUrl = `https://classreflect-audio-files-573524060586.s3.eu-west-2.amazonaws.com/${job.s3_key}`;
      } else {
        throw new Error(`No valid audio URL found for job ${jobId}`);
      }

      console.log(`📁 Audio URL: ${audioUrl}`);

      // Update job status to processing
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_started_at = NOW() WHERE id = ?',
        ['processing', jobId]
      );

      // Configure transcription parameters
      const params = {
        audio: audioUrl,
        speech_model: 'best' as const, // Use the best available model
        language_detection: true,
        punctuate: true,
        format_text: true,
        dual_channel: false,
        // Educational features
        auto_chapters: false,
        speaker_labels: false, // Could enable this for teacher/student identification
        word_timestamps: true,
        filter_profanity: false, // Keep unfiltered for accurate analysis
        redact_pii: false,
        redact_pii_audio: false,
        redact_pii_policies: []
        // redact_pii_sub removed since redact_pii is false
      };

      // Submit transcription request
      const transcript = await this.client.transcripts.transcribe(params);

      console.log(`📝 Transcription submitted with ID: ${transcript.id}`);
      console.log(`⏳ Status: ${transcript.status}`);

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Store transcript
      await this.storeTranscript(jobId, transcript, job);

      // Mark job as completed
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_completed_at = NOW() WHERE id = ?',
        ['completed', jobId]
      );

      console.log(`✅ AssemblyAI transcription completed for job ${jobId}`);

    } catch (error: any) {
      console.error(`❌ AssemblyAI transcription failed for job ${jobId}:`, error);
      await this.markJobFailed(jobId, error.message);
      throw error;
    }
  }

  /**
   * Get transcript by AssemblyAI ID
   */
  async getTranscript(transcriptId: string): Promise<AssemblyAITranscriptResult> {
    try {
      const transcript = await this.client.transcripts.get(transcriptId);
      
      return {
        id: transcript.id,
        text: transcript.text || '',
        status: transcript.status,
        confidence: transcript.confidence || 0,
        audio_duration: transcript.audio_duration || 0,
        words: transcript.words ? transcript.words.map(word => ({
          text: word.text,
          start: word.start,
          end: word.end,
          confidence: word.confidence
        })) : undefined
      };
    } catch (error: any) {
      console.error(`Failed to get transcript ${transcriptId}:`, error);
      throw error;
    }
  }

  /**
   * Store transcript in database
   */
  private async storeTranscript(jobId: string, transcript: any, job: any): Promise<void> {
    try {
      const wordCount = transcript.text ? transcript.text.split(' ').length : 0;
      const processingTime = transcript.audio_duration || 0;
      const confidence = transcript.confidence || 0.95;

      await pool.execute(
        `INSERT INTO transcripts (
          job_id, teacher_id, school_id, transcript_text, 
          word_count, confidence_score, processing_time_seconds, 
          external_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          jobId,
          job.teacher_id,
          job.school_id,
          transcript.text || '',
          wordCount,
          confidence,
          processingTime,
          transcript.id // Store AssemblyAI transcript ID
        ]
      );

      console.log(`💾 Transcript stored for job ${jobId}`);

      // Store word-level timestamps if available
      if (transcript.words && transcript.words.length > 0) {
        await this.storeWordTimestamps(jobId, transcript.words);
      }

    } catch (error: any) {
      console.error(`Failed to store transcript for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Store word-level timestamps (optional, for advanced analysis)
   */
  private async storeWordTimestamps(jobId: string, words: any[]): Promise<void> {
    try {
      // Create word_timestamps table if it doesn't exist
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS word_timestamps (
          id INT PRIMARY KEY AUTO_INCREMENT,
          job_id VARCHAR(36) NOT NULL,
          word_text VARCHAR(255) NOT NULL,
          start_time DECIMAL(10,3) NOT NULL,
          end_time DECIMAL(10,3) NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          word_index INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_job_id (job_id),
          INDEX idx_timestamps (start_time, end_time),
          FOREIGN KEY (job_id) REFERENCES audio_jobs(id)
        )
      `);

      // Insert word timestamps in batches for performance
      const batchSize = 100;
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        
        const values = batch.map((word, index) => [
          jobId,
          word.text,
          word.start / 1000, // Convert ms to seconds
          word.end / 1000,
          word.confidence,
          i + index
        ]);

        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        
        await pool.execute(
          `INSERT INTO word_timestamps (job_id, word_text, start_time, end_time, confidence, word_index) VALUES ${placeholders}`,
          values.flat()
        );
      }

      console.log(`📚 Stored ${words.length} word timestamps for job ${jobId}`);

    } catch (error: any) {
      console.error(`Failed to store word timestamps for job ${jobId}:`, error);
      // Don't throw - this is optional functionality
    }
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await pool.execute(
      'UPDATE audio_jobs SET status = ?, error_message = ?, processing_completed_at = NOW() WHERE id = ?',
      ['failed', errorMessage.substring(0, 500), jobId] // Limit error message length
    );
  }
}

// Create singleton instance - API key should be set in environment variables
const assemblyAIService = new AssemblyAIService(
  process.env.ASSEMBLYAI_API_KEY || (() => {
    console.warn('⚠️  ASSEMBLYAI_API_KEY not found in environment variables');
    return '';
  })()
);

export { assemblyAIService, AssemblyAIService };