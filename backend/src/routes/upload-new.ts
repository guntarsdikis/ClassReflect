import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import pool from '../database';
import { storageService } from '../services/storage';
import { processingService } from '../services/processing';
import { config } from '../config/environment';
import { authenticate, authorize } from '../middleware/auth-cognito';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3', 
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

/**
 * Generate pre-signed URL for direct upload
 * Supports both S3 (production) and local filesystem (development)
 */
router.post('/presigned-url', 
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { fileName, fileType, teacherId, schoolId } = req.body;

      if (!fileName || !fileType || !teacherId || !schoolId) {
        return res.status(400).json({ 
          error: 'Missing required fields: fileName, fileType, teacherId, schoolId' 
        });
      }

      // Role-based access control
      const accessCheckResult = await validateUploadAccess(req, teacherId, schoolId);
      if (!accessCheckResult.allowed) {
        return res.status(403).json({ error: accessCheckResult.error });
      }

      // Generate unique job ID and file key
      const jobId = uuidv4();
      const fileExtension = fileName.split('.').pop() || 'mp3';
      const fileKey = `audio-files/${schoolId}/${teacherId}/${jobId}.${fileExtension}`;

      // Create job record in database
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO audio_jobs (id, teacher_id, school_id, file_name, s3_key, status, created_at) 
         VALUES (?, ?, ?, ?, ?, 'uploading', NOW())`,
        [jobId, teacherId, schoolId, fileName, fileKey]
      );

      // Generate upload URL using storage service
      const uploadUrl = await storageService.generatePresignedUrl(fileKey, fileType);

      res.json({
        jobId,
        uploadUrl,
        fileKey,
        environment: config.env,
        expiresIn: 3600 // 1 hour
      });

    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);

/**
 * Direct file upload endpoint
 * Handles both S3 and local storage based on environment
 */
router.post('/direct', 
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  upload.single('audio'), 
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { teacherId, schoolId } = req.body;

      if (!teacherId || !schoolId) {
        return res.status(400).json({ 
          error: 'Missing required fields: teacherId, schoolId' 
        });
      }

      // Role-based access control
      const accessCheckResult = await validateUploadAccess(req, parseInt(teacherId), parseInt(schoolId));
      if (!accessCheckResult.allowed) {
        return res.status(403).json({ error: accessCheckResult.error });
      }

      // Generate unique job ID and file key
      const jobId = uuidv4();
      const fileExtension = req.file.originalname.split('.').pop() || 'mp3';
      const fileKey = `audio-files/${schoolId}/${teacherId}/${jobId}.${fileExtension}`;

      // Create job record in database
      await pool.execute<ResultSetHeader>(
        `INSERT INTO audio_jobs (id, teacher_id, school_id, file_name, s3_key, file_size, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'uploading', NOW())`,
        [jobId, teacherId, schoolId, req.file.originalname, fileKey, req.file.size]
      );

      // Upload file using storage service
      const fileUrl = await storageService.upload(
        fileKey,
        req.file.buffer,
        req.file.mimetype,
        {
          'teacher-id': teacherId.toString(),
          'school-id': schoolId.toString(),
          'job-id': jobId,
          'original-name': req.file.originalname
        }
      );

      // Update job with file URL and mark as queued
      await pool.execute(
        'UPDATE audio_jobs SET file_url = ?, status = ? WHERE id = ?',
        [fileUrl, 'queued', jobId]
      );

      // Queue for processing using processing service
      await processingService.enqueueJob({
        jobId,
        teacherId: parseInt(teacherId),
        schoolId: parseInt(schoolId),
        fileName: req.file.originalname,
        filePath: config.env === 'local' ? fileKey : fileUrl,
        fileSize: req.file.size,
        contentType: req.file.mimetype
      });

      res.json({
        jobId,
        status: 'queued',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        environment: config.env,
        message: `File uploaded successfully and queued for processing (${config.processing.type})`
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

/**
 * Local upload endpoint for pre-signed URLs (development only)
 */
router.post('/local/:fileKey', async (req: Request, res: Response) => {
  if (config.env !== 'local') {
    return res.status(404).json({ error: 'Endpoint not available in production' });
  }

  try {
    const { fileKey } = req.params;
    const contentType = req.query.contentType as string || 'audio/mpeg';
    
    if (!fileKey) {
      return res.status(400).json({ error: 'File key is required' });
    }

    // Get the file buffer from request body
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        
        // Upload using storage service
        const fileUrl = await storageService.upload(
          decodeURIComponent(fileKey),
          fileBuffer,
          contentType
        );

        // Update job status to queued and start processing
        const jobId = path.basename(fileKey, path.extname(fileKey));
        
        await pool.execute(
          'UPDATE audio_jobs SET file_url = ?, file_size = ?, status = ? WHERE id = ?',
          [fileUrl, fileBuffer.length, 'queued', jobId]
        );

        // Get job details for processing
        const [jobRows] = await pool.execute<RowDataPacket[]>(
          'SELECT * FROM audio_jobs WHERE id = ?',
          [jobId]
        );

        if (jobRows.length > 0) {
          const job = jobRows[0];
          await processingService.enqueueJob({
            jobId,
            teacherId: job.teacher_id,
            schoolId: job.school_id,
            fileName: job.file_name,
            filePath: fileUrl,
            fileSize: fileBuffer.length,
            contentType
          });
        }

        res.json({
          message: 'File uploaded successfully',
          jobId,
          status: 'queued'
        });

      } catch (error) {
        console.error('Local upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    });

  } catch (error) {
    console.error('Local upload setup error:', error);
    res.status(500).json({ error: 'Upload setup failed' });
  }
});

/**
 * Upload completion webhook (for pre-signed URL uploads)
 */
router.post('/complete/:jobId', 
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { fileSize } = req.body;

      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      // Get job details
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ? AND status = "uploading"',
        [jobId]
      );

      if (!jobRows || jobRows.length === 0) {
        return res.status(404).json({ error: 'Job not found or not in uploading state' });
      }

      const job = jobRows[0];
      
      // Update job status to queued
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, file_size = ? WHERE id = ?',
        ['queued', fileSize || null, jobId]
      );

      // Queue for processing
      const filePath = config.env === 'local' 
        ? path.join(config.storage.localPath!, job.s3_key)
        : job.s3_key;

      await processingService.enqueueJob({
        jobId,
        teacherId: job.teacher_id,
        schoolId: job.school_id,
        fileName: job.file_name,
        filePath,
        fileSize: fileSize || job.file_size || 0,
        contentType: 'audio/mpeg'
      });

      res.json({
        jobId,
        status: 'queued',
        message: `Upload completed and queued for processing (${config.processing.type})`
      });

    } catch (error) {
      console.error('Upload completion error:', error);
      res.status(500).json({ error: 'Failed to complete upload' });
    }
  }
);

/**
 * Get upload/processing status
 */
router.get('/status/:jobId', 
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT aj.*, t.transcript_text, t.word_count, t.confidence_score
         FROM audio_jobs aj
         LEFT JOIN transcripts t ON aj.id = t.job_id
         WHERE aj.id = ?`,
        [jobId]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = rows[0];
      
      // Basic access control - users can only see their own jobs or jobs from their school
      const hasAccess = 
        req.user!.role === 'super_admin' ||
        (req.user!.role === 'teacher' && job.teacher_id === req.user!.id) ||
        (req.user!.role === 'school_manager' && job.school_id === req.user!.schoolId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({
        jobId: job.id,
        status: job.status,
        fileName: job.file_name,
        fileSize: job.file_size,
        teacherId: job.teacher_id,
        schoolId: job.school_id,
        processingStartedAt: job.processing_started_at,
        processingCompletedAt: job.processing_completed_at,
        errorMessage: job.error_message,
        transcript: job.transcript_text ? {
          text: job.transcript_text,
          wordCount: job.word_count,
          confidence: job.confidence_score
        } : null,
        environment: config.env,
        createdAt: job.created_at
      });

    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
);

/**
 * Validate upload access based on user role
 */
async function validateUploadAccess(req: Request, teacherId: number, schoolId: number) {
  const user = req.user!;

  if (user.role === 'teacher') {
    // Teachers can only upload their own recordings
    if (teacherId !== user.id) {
      return { allowed: false, error: 'Teachers can only upload their own recordings' };
    }
    if (schoolId !== user.schoolId) {
      return { allowed: false, error: 'School ID mismatch' };
    }
  } else if (user.role === 'school_manager') {
    // Managers can upload for teachers in their school
    if (schoolId !== user.schoolId) {
      return { allowed: false, error: 'Managers can only upload for teachers in their school' };
    }
    // Verify the target teacher belongs to the manager's school
    const [teacherCheck] = await pool.execute<RowDataPacket[]>(
      'SELECT school_id FROM users WHERE id = ? AND role = "teacher"',
      [teacherId]
    );
    if (!teacherCheck.length || teacherCheck[0].school_id !== user.schoolId) {
      return { allowed: false, error: 'Teacher not found in your school' };
    }
  }
  // Super admins can upload for anyone

  return { allowed: true };
}

export default router;