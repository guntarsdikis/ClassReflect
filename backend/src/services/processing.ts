/**
 * Processing Queue Abstraction Layer
 * Handles job processing for both local development and production environments
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config/environment';
import pool from '../database';
import { RowDataPacket } from 'mysql2';

export interface ProcessingService {
  enqueueJob(jobData: AudioJobData): Promise<void>;
  processJob(jobId: string): Promise<void>;
}

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
 * SQS + EC2 Processing Service (Production)
 */
class SQSProcessingService implements ProcessingService {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor(queueUrl: string) {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.queueUrl = queueUrl;
  }

  async enqueueJob(jobData: AudioJobData): Promise<void> {
    const message = {
      jobId: jobData.jobId,
      teacherId: jobData.teacherId,
      schoolId: jobData.schoolId,
      fileName: jobData.fileName,
      filePath: jobData.filePath,
      fileSize: jobData.fileSize,
      contentType: jobData.contentType,
      timestamp: new Date().toISOString()
    };

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        'job_type': {
          DataType: 'String',
          StringValue: 'audio_transcription'
        },
        'school_id': {
          DataType: 'Number',
          StringValue: jobData.schoolId.toString()
        }
      }
    });

    await this.sqsClient.send(command);
    console.log(`✅ Job ${jobData.jobId} queued in SQS`);
  }

  async processJob(jobId: string): Promise<void> {
    // In production, processing is handled by EC2 instance
    console.log(`Job ${jobId} will be processed by EC2 instance`);
  }
}

/**
 * Local Docker Processing Service (Development)
 */
class LocalDockerProcessingService implements ProcessingService {
  private dockerServiceUrl: string;

  constructor(dockerServiceUrl: string) {
    this.dockerServiceUrl = dockerServiceUrl;
  }

  async enqueueJob(jobData: AudioJobData): Promise<void> {
    console.log(`🏠 Processing job ${jobData.jobId} locally with Docker`);
    
    // Update job status to processing
    await pool.execute(
      'UPDATE audio_jobs SET status = ?, processing_started_at = NOW() WHERE id = ?',
      ['processing', jobData.jobId]
    );

    // Process immediately (no queue needed for local development)
    this.processJob(jobData.jobId).catch(error => {
      console.error(`Failed to process job ${jobData.jobId}:`, error);
      this.markJobFailed(jobData.jobId, error.message);
    });
  }

  async processJob(jobId: string): Promise<void> {
    try {
      // Get job details
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );

      if (!jobRows || jobRows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const job = jobRows[0];
      // For local development, use file_url (full path), for production use s3_key
      const localFilePath = job.file_url || job.s3_key;

      console.log(`🎙️ Starting Whisper processing for job ${jobId}`);
      console.log(`📁 File: ${localFilePath}`);

      // Convert host path to Docker container path  
      const containerFilePath = this.convertToContainerPath(localFilePath);
      console.log(`🐳 Container path: ${containerFilePath}`);

      // Call local Docker Whisper service
      const response = await fetch(`${this.dockerServiceUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          file_path: containerFilePath,
          language: 'en'  // Default to English, can be made configurable
        })
      });

      if (!response.ok) {
        throw new Error(`Whisper service responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Whisper service handles transcript storage directly
      console.log(`✅ Whisper processing completed for job ${jobId}`);
      
      // Mark job as completed
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, processing_completed_at = NOW() WHERE id = ?',
        ['completed', jobId]
      );

      console.log(`✅ Job ${jobId} completed successfully`);

    } catch (error: any) {
      console.error(`❌ Job ${jobId} failed:`, error);
      await this.markJobFailed(jobId, error.message);
    }
  }

  private async storeTranscript(jobId: string, transcriptionResult: any): Promise<void> {
    const { text, confidence, word_count, processing_time } = transcriptionResult;

    // Get job details for teacher_id and school_id
    const [jobRows] = await pool.execute<RowDataPacket[]>(
      'SELECT teacher_id, school_id FROM audio_jobs WHERE id = ?',
      [jobId]
    );

    if (!jobRows || jobRows.length === 0) {
      throw new Error(`Job ${jobId} not found for transcript storage`);
    }

    const job = jobRows[0];

    await pool.execute(
      `INSERT INTO transcripts (
        job_id, teacher_id, school_id, transcript_text, 
        word_count, confidence_score, processing_time_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        jobId,
        job.teacher_id,
        job.school_id,
        text,
        word_count || text.split(' ').length,
        confidence || 0.95,
        processing_time || 0
      ]
    );
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await pool.execute(
      'UPDATE audio_jobs SET status = ?, error_message = ?, processing_completed_at = NOW() WHERE id = ?',
      ['failed', errorMessage, jobId]
    );
  }

  private convertToContainerPath(hostPath: string): string {
    // Convert file:// URLs to regular paths
    const cleanPath = hostPath.replace(/^file:\/\//, '');
    
    // Convert host path /tmp/classreflect-audio/... to container path /tmp/audio/...
    // Based on Docker volume mount: /tmp/classreflect-audio -> /tmp/audio
    return cleanPath.replace('/tmp/classreflect-audio', '/tmp/audio');
  }
}

/**
 * Create processing service based on environment configuration
 */
function createProcessingService(): ProcessingService {
  if (config.processing.type === 'sqs-ec2') {
    return new SQSProcessingService(config.processing.sqsQueueUrl!);
  } else {
    return new LocalDockerProcessingService(config.processing.dockerServiceUrl!);
  }
}

export const processingService = createProcessingService();
export { SQSProcessingService, LocalDockerProcessingService };