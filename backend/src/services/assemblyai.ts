/**
 * AssemblyAI Transcription Service
 * Replaces Whisper processing with AssemblyAI API
 */

import { AssemblyAI } from 'assemblyai';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pool from '../database';
import { RowDataPacket } from 'mysql2';

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
  private uploadMode: 'auto' | 'direct' | 's3';
  private directMaxBytes: number;

  constructor(apiKey: string) {
    this.client = new AssemblyAI({
      apiKey: apiKey
    });
    // Configure upload strategy
    const mode = (process.env.ASSEMBLYAI_UPLOAD_MODE || 'auto').toLowerCase();
    this.uploadMode = (mode === 'direct' || mode === 's3') ? (mode as any) : 'auto';
    const maxMb = parseInt(process.env.ASSEMBLYAI_DIRECT_MAX_MB || '25', 10);
    this.directMaxBytes = (isNaN(maxMb) ? 25 : maxMb) * 1024 * 1024;
  }

  /**
   * Generate a presigned GET URL for S3 object using AWS SDK v3
   */
  private async presignS3GetUrl(bucket: string, key: string, region: string, expiresSeconds: number): Promise<string> {
    const s3Client = new S3Client({ region });
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
    
    try {
      const u = new URL(url);
      console.log(`🔗 Presigned GET URL: host=${u.host} path=${u.pathname}`);
    } catch (e) {
      console.warn('⚠️ Presigned GET URL parse issue:', (e as any)?.message || e);
    }

    return url;
  }

  /**
   * Transcribe audio buffer directly with AssemblyAI
   */
  async transcribeBuffer(jobId: string, audioBuffer: Buffer): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI transcription for job ${jobId}`);
      console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes`);

      // Get job details
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );

      if (!jobRows || jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobRows[0];

      // Update job status to processing
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_started_at = NOW() WHERE id = ?',
        ['processing', jobId]
      );

      // Step 1: Determine upload path and obtain an audio URL AssemblyAI can access
      let uploadUrl: string | null = null;

      const preferS3First =
        this.uploadMode === 's3' ||
        (this.uploadMode === 'auto' && ((job.file_size || audioBuffer.length) > this.directMaxBytes));

      if (preferS3First) {
        uploadUrl = await this.uploadToS3AndGetUrl(jobId, job, audioBuffer);
      } else {
        console.log(`📤 Uploading audio buffer to AssemblyAI...`);
        const maxAttempts = 3;
        let attempt = 0;
        while (attempt < maxAttempts && !uploadUrl) {
          attempt++;
          try {
            uploadUrl = await this.client.files.upload(audioBuffer);
            console.log(`✅ Audio file uploaded to AssemblyAI (attempt ${attempt}): ${uploadUrl}`);

            // Store the upload URL in database for retry logic (valid ~24h)
            await pool.execute(
              'UPDATE audio_jobs SET assemblyai_upload_url = ? WHERE id = ?',
              [uploadUrl, jobId]
            );
            console.log(`💾 AssemblyAI upload URL stored in database`);
          } catch (uploadError: any) {
            const msg = uploadError?.message || String(uploadError);
            console.error(`❌ AssemblyAI upload failed (attempt ${attempt}) for job ${jobId}:`, msg);
            if (attempt < maxAttempts) {
              const delayMs = 750 * Math.pow(2, attempt - 1);
              await new Promise(r => setTimeout(r, delayMs));
            }
          }
        }

        if (!uploadUrl) {
          if (this.uploadMode === 'direct') {
            throw new Error('File upload failed via AssemblyAI (direct mode)');
          }
          console.warn(`⚠️ Direct upload failed after ${maxAttempts} attempts. Falling back to S3 for job ${jobId}`);
          uploadUrl = await this.uploadToS3AndGetUrl(jobId, job, audioBuffer);
        }
      }

      // Step 2: Submit transcription request
      try {
        const params = {
          audio_url: uploadUrl,
          speech_model: 'best' as const,
          language_detection: true,
          punctuate: true,
          format_text: true
        };

        console.log(`📝 Submitting transcription request to AssemblyAI...`);
        const transcript = await this.client.transcripts.transcribe(params);

        console.log(`📝 Transcription submitted with ID: ${transcript.id}`);
        console.log(`⏳ Status: ${transcript.status}`);

        if (transcript.status === 'error') {
          throw new Error(`Transcription failed: ${transcript.error}`);
        }

        // Store the transcript ID in database for future reference
        await pool.execute(
          'UPDATE audio_jobs SET assemblyai_transcript_id = ? WHERE id = ?',
          [transcript.id, jobId]
        );
        console.log(`💾 AssemblyAI transcript ID stored in database`);

        // Store transcript results
        await this.storeTranscript(jobId, transcript, job);

        // Mark job as completed
        await pool.execute(
          'UPDATE audio_jobs SET status = ?, processing_completed_at = NOW() WHERE id = ?',
          ['completed', jobId]
        );

        console.log(`✅ AssemblyAI transcription completed for job ${jobId}`);

      } catch (transcriptionError: any) {
        console.error(`❌ AssemblyAI transcription failed for job ${jobId}:`, transcriptionError.message);
        throw new Error(`Transcription failed: ${transcriptionError.message}`);
      }

    } catch (error: any) {
      console.error(`❌ AssemblyAI transcription failed for job ${jobId}:`, error);
      await this.markJobFailed(jobId, error.message);
      throw error;
    }
  }

  /**
   * Transcribe directly from an existing S3 object by generating a presigned GET URL
   */
  async transcribeFromS3Key(jobId: string, s3Key: string): Promise<void> {
    try {
      console.log(`🎙️ Starting AssemblyAI transcription from S3 for job ${jobId}`);

      // Load job
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );
      if (!jobRows || jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }
      const job = jobRows[0];

      // Update job status to processing
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_started_at = NOW(), s3_key = ? WHERE id = ?',
        ['processing', s3Key, jobId]
      );

      // Generate presigned GET URL (robust)
      const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'classreflect-audio-files-573524060586';
      const region = process.env.AWS_REGION || 'eu-west-2';
      const expirySeconds = parseInt(process.env.S3_PRESIGNED_EXPIRES_SECONDS || '7200', 10);
      const presignedUrl = await this.presignS3GetUrl(
        bucket,
        s3Key,
        region,
        isNaN(expirySeconds) ? 7200 : expirySeconds
      );

      // Persist URL for retry purposes
      await pool.execute(
        'UPDATE audio_jobs SET assemblyai_upload_url = ? WHERE id = ?',
        [presignedUrl, jobId]
      );

      // Submit transcription request using the presigned URL
      const params = {
        audio_url: presignedUrl,
        speech_model: 'best' as const,
        language_detection: true,
        punctuate: true,
        format_text: true
      };

      console.log(`📝 Submitting transcription request to AssemblyAI (S3)...`);
      const transcript = await this.client.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      await pool.execute(
        'UPDATE audio_jobs SET assemblyai_transcript_id = ? WHERE id = ?',
        [transcript.id, jobId]
      );

      await this.storeTranscript(jobId, transcript, job);

      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_completed_at = NOW() WHERE id = ?',
        ['completed', jobId]
      );

      console.log(`✅ AssemblyAI transcription (S3) completed for job ${jobId}`);
    } catch (error: any) {
      console.error(`❌ AssemblyAI transcription (S3) failed for job ${jobId}:`, error);
      await this.markJobFailed(jobId, error.message);
      throw error;
    }
  }

  /**
   * Upload audio buffer to S3 with retries and return a presigned GET URL using AWS SDK v3
   */
  private async uploadToS3AndGetUrl(jobId: string, job: any, audioBuffer: Buffer): Promise<string> {
    const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'classreflect-audio-files-573524060586';
    const region = process.env.AWS_REGION || 'eu-west-2';
    const s3Client = new S3Client({ region });

    const originalName = job.file_name || 'audio';
    const safeName = String(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/jobs/${jobId}/${safeName}`;

    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        console.log(`📦 Uploading to S3 (attempt ${attempt}) -> s3://${bucket}/${s3Key}`);
        
        const putCommand = new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: audioBuffer,
          ContentType: 'application/octet-stream'
        });
        
        await s3Client.send(putCommand);

        try {
          await pool.execute(
            'UPDATE audio_jobs SET s3_key = ? WHERE id = ?',
            [s3Key, jobId]
          );
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes("Unknown column 's3_key'")) {
            console.warn('🛠️  Adding missing column audio_jobs.s3_key on the fly');
            await pool.query(`ALTER TABLE audio_jobs ADD COLUMN s3_key VARCHAR(500) NULL`);
            await pool.execute(
              'UPDATE audio_jobs SET s3_key = ? WHERE id = ?',
              [s3Key, jobId]
            );
          } else {
            throw e;
          }
        }

        const expirySeconds = parseInt(process.env.S3_PRESIGNED_EXPIRES_SECONDS || '7200', 10);
        const presignedUrl = await this.presignS3GetUrl(
          bucket,
          s3Key,
          region,
          isNaN(expirySeconds) ? 7200 : expirySeconds
        );

        try {
          await pool.execute(
            'UPDATE audio_jobs SET assemblyai_upload_url = ? WHERE id = ?',
            [presignedUrl, jobId]
          );
        } catch (e: any) {
          const msg = e?.message || '';
          if (msg.includes("Unknown column 'assemblyai_upload_url'")) {
            console.warn('🛠️  Adding missing column audio_jobs.assemblyai_upload_url on the fly');
            await pool.query(`ALTER TABLE audio_jobs ADD COLUMN assemblyai_upload_url VARCHAR(500) NULL`);
            await pool.execute(
              'UPDATE audio_jobs SET assemblyai_upload_url = ? WHERE id = ?',
              [presignedUrl, jobId]
            );
          } else {
            throw e;
          }
        }

        console.log(`✅ S3 upload complete. Using presigned URL for transcription.`);
        return presignedUrl;
      } catch (err: any) {
        lastError = err;
        console.error(`❌ S3 upload failed (attempt ${attempt}) for job ${jobId}:`, err?.message || err);
        if (attempt < maxAttempts) {
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    throw new Error(`S3 upload failed after ${maxAttempts} attempts: ${lastError?.message || lastError}`);
  }

  /**
   * Retry transcription using stored AssemblyAI upload URL (valid 24h)
   */
  async retryTranscription(jobId: string): Promise<void> {
    try {
      console.log(`🔄 Retrying transcription for job ${jobId}`);

      // Get job details including stored upload URL
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ? AND assemblyai_upload_url IS NOT NULL',
        [jobId]
      );

      if (!jobRows || jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found or no stored upload URL`);
      }

      const job = jobRows[0];
      
      if (!job.assemblyai_upload_url) {
        throw new Error(`No AssemblyAI upload URL stored for job ${jobId}`);
      }

      console.log(`📤 Using stored AssemblyAI URL: ${job.assemblyai_upload_url}`);

      // Reset job status
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, error_message = NULL, processing_started_at = NOW() WHERE id = ?',
        ['processing', jobId]
      );

      // Configure transcription parameters (simplified)
      const params = {
        audio_url: job.assemblyai_upload_url,
        speech_model: 'best' as const,
        language_detection: true,
        punctuate: true,
        format_text: true,
        word_timestamps: true
      };

      // Submit transcription request
      console.log(`📝 Retrying transcription request to AssemblyAI...`);
      const transcript = await this.client.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      // Store transcript ID and results
      await pool.execute(
        'UPDATE audio_jobs SET assemblyai_transcript_id = ? WHERE id = ?',
        [transcript.id, jobId]
      );

      await this.storeTranscript(jobId, transcript, job);

      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_completed_at = NOW() WHERE id = ?',
        ['completed', jobId]
      );

      console.log(`✅ Retry successful for job ${jobId}`);

    } catch (error: any) {
      console.error(`❌ Retry failed for job ${jobId}:`, error);
      await this.markJobFailed(jobId, error.message);
      throw error;
    }
  }

  // Note: Legacy S3-based transcription method removed - AssemblyAI-only system

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
