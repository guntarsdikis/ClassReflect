import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
// import fs from 'fs/promises'; // Removed - no file storage
// import path from 'path'; // Removed - no file paths needed
import pool from '../database';
// import { storageService } from '../services/storage'; // Removed - AssemblyAI-only system
import { processingService } from '../services/processing';
import { config } from '../config/environment';
import { authenticate, authorize } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// Note: Presigned URL endpoint removed - AssemblyAI-only direct uploads
// Re-added: Presigned URL for direct S3 uploads

/**
 * Generate a presigned PUT URL for direct browser-to-S3 upload.
 * Creates the job record in status 'uploading'.
 */
router.post('/presigned-put', 
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { fileName, fileType, fileSize, teacherId, schoolId, className, subject, grade, duration, notes } = req.body;

      if (!fileName || !fileType || !fileSize || !teacherId || !schoolId) {
        return res.status(400).json({ error: 'Missing required fields: fileName, fileType, fileSize, teacherId, schoolId' });
      }

      const accessCheckResult = await validateUploadAccess(req, parseInt(teacherId), parseInt(schoolId));
      if (!accessCheckResult.allowed) {
        return res.status(403).json({ error: accessCheckResult.error });
      }

      const jobId = uuidv4();
      const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
      const region = process.env.AWS_REGION || 'eu-west-2';

      if (!bucket) {
        return res.status(500).json({ error: 'S3 bucket not configured' });
      }

      // Use AWS SDK v3 for S3 operations
      const s3Client = new S3Client({ region });
      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `uploads/jobs/${jobId}/${safeName}`;

      // Create DB job in 'uploading' status (store metadata if provided)
      try {
        await pool.execute<ResultSetHeader>(
          `INSERT INTO audio_jobs (
            id, teacher_id, school_id, file_name, file_size, status, s3_key,
            class_name, subject, grade, class_duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, ?, ?, ?, ?)`,
          [
            jobId,
            parseInt(teacherId),
            parseInt(schoolId),
            fileName,
            parseInt(fileSize),
            s3Key,
            className?.trim() || null,
            subject?.trim() || null,
            grade?.trim() || null,
            duration ? parseInt(duration) : null,
            notes?.trim() || null
          ]
        );
      } catch (e: any) {
        const msg: string = e?.message || '';
        if (msg.includes("Unknown column 's3_key'")) {
          console.warn('🛠️  Adding missing column audio_jobs.s3_key on the fly');
          await pool.query(`ALTER TABLE audio_jobs ADD COLUMN s3_key VARCHAR(500) NULL`);
          // retry insert
          await pool.execute<ResultSetHeader>(
            `INSERT INTO audio_jobs (
              id, teacher_id, school_id, file_name, file_size, status, s3_key,
              class_name, subject, grade, class_duration_minutes, notes
            ) VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, ?, ?, ?, ?)`,
            [
              jobId,
              parseInt(teacherId),
              parseInt(schoolId),
              fileName,
              parseInt(fileSize),
              s3Key,
              className?.trim() || null,
              subject?.trim() || null,
              grade?.trim() || null,
              duration ? parseInt(duration) : null,
              notes?.trim() || null
            ]
          );
        } else if (msg.includes('Incorrect') && msg.includes('status')) {
          console.warn('🛠️  Adjusting audio_jobs.status enum to include uploading');
          await pool.query(`ALTER TABLE audio_jobs MODIFY COLUMN status ENUM('pending','uploading','queued','processing','completed','failed') DEFAULT 'pending'`);
          // retry insert
          await pool.execute<ResultSetHeader>(
            `INSERT INTO audio_jobs (
              id, teacher_id, school_id, file_name, file_size, status, s3_key,
              class_name, subject, grade, class_duration_minutes, notes
            ) VALUES (?, ?, ?, ?, ?, 'uploading', ?, ?, ?, ?, ?, ?)`,
            [
              jobId,
              parseInt(teacherId),
              parseInt(schoolId),
              fileName,
              parseInt(fileSize),
              s3Key,
              className?.trim() || null,
              subject?.trim() || null,
              grade?.trim() || null,
              duration ? parseInt(duration) : null,
              notes?.trim() || null
            ]
          );
        } else {
          throw e;
        }
      }

      // Generate presigned PUT URL using AWS SDK v3
      const putExpires = parseInt(process.env.S3_PRESIGNED_PUT_EXPIRES_SECONDS || '14400', 10);
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: fileType || 'application/octet-stream'
      });
      
      const uploadUrl = await getSignedUrl(s3Client, cmd, { 
        expiresIn: isNaN(putExpires) ? 3600 : putExpires 
      });
      
      try {
        const u = new URL(uploadUrl);
        console.log(`📝 Presigned PUT generated for ${bucket}/${s3Key} -> host=${u.host} path=${u.pathname} (exp=${isNaN(putExpires) ? 3600 : putExpires}s)`);
      } catch (e) {
        console.error('Presign URL parse error:', e);
      }

      // Return debug fields to help diagnose any client-side CORS issues
      let uploadHost: string | undefined;
      let uploadPath: string | undefined;
      try {
        const u = new URL(uploadUrl);
        uploadHost = u.host;
        uploadPath = u.pathname;
      } catch {}
      res.json({ jobId, uploadUrl, uploadHost, uploadPath, s3Key, bucket, region });
    } catch (error) {
      console.error('Presigned URL error:', error);
      res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
  }
);

/**
 * Get a presigned GET URL for audio playback for a given jobId
 */
router.get('/playback-url/:jobId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, teacher_id, school_id, s3_key, file_name FROM audio_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Job not found' });
      const job = rows[0];

      // Access: teacher owns it, manager of same school, or super admin
      const user = req.user!;
      const allowed = user.role === 'super_admin' ||
        (user.role === 'teacher' && user.id === job.teacher_id) ||
        (user.role === 'school_manager' && user.schoolId === job.school_id);
      if (!allowed) return res.status(403).json({ error: 'Access denied' });

      if (!job.s3_key) return res.status(400).json({ error: 'No audio file available for playback' });

      const bucket = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
      const region = process.env.AWS_REGION || 'eu-west-2';
      if (!bucket) return res.status(500).json({ error: 'S3 not configured' });

      const s3 = new S3Client({ region });
      // Lazily import to avoid ESM named import mismatch here
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const expiry = parseInt(process.env.S3_PRESIGNED_PLAY_EXPIRES_SECONDS || '600', 10);
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: job.s3_key });
      const url = await getSignedUrl(s3, cmd, { expiresIn: isNaN(expiry) ? 600 : expiry });
      res.json({ jobId, fileName: job.file_name, url, expiresIn: isNaN(expiry) ? 600 : expiry });
    } catch (err) {
      console.error('Playback URL error:', err);
      res.status(500).json({ error: 'Failed to create playback URL' });
    }
  }
);

/**
 * Direct file upload endpoint
 * AssemblyAI-only processing (no file storage)
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

      const { teacherId, schoolId, className, subject, grade, duration, notes } = req.body;

      if (!teacherId || !schoolId) {
        return res.status(400).json({ 
          error: 'Missing required fields: teacherId, schoolId' 
        });
      }

      // Process form data - convert empty strings to null, handle types
      const processedClassName = className && className.trim() !== '' ? className.trim() : null;
      const processedSubject = subject && subject.trim() !== '' ? subject.trim() : null;
      const processedGrade = grade && grade.trim() !== '' ? grade.trim() : null;
      const processedDuration = duration && !isNaN(parseInt(duration)) ? parseInt(duration) : null;
      const processedNotes = notes && notes.trim() !== '' ? notes.trim() : null;

      // Role-based access control
      const accessCheckResult = await validateUploadAccess(req, parseInt(teacherId), parseInt(schoolId));
      if (!accessCheckResult.allowed) {
        return res.status(403).json({ error: accessCheckResult.error });
      }

      // Generate unique job ID
      const jobId = uuidv4();

      // Create job record in database (AssemblyAI-only, no S3/storage)
      await pool.execute<ResultSetHeader>(
        `INSERT INTO audio_jobs (id, teacher_id, school_id, class_name, subject, grade, class_duration_minutes, notes, file_name, file_size, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
        [jobId, teacherId, schoolId, processedClassName, processedSubject, processedGrade, processedDuration, processedNotes, req.file.originalname, req.file.size]
      );

      // Process directly with AssemblyAI using file buffer
      await processingService.enqueueJob({
        jobId,
        teacherId: parseInt(teacherId),
        schoolId: parseInt(schoolId),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        contentType: req.file.mimetype,
        audioBuffer: req.file.buffer // Pass buffer directly to AssemblyAI
      });

      res.json({
        jobId,
        status: 'queued',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        message: 'File queued for AssemblyAI processing (no storage needed)'
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// Note: Local upload endpoint removed - AssemblyAI-only system

// Note: Upload completion webhook removed - no presigned URLs in AssemblyAI-only system

/**
 * Upload completion callback for direct S3 uploads.
 * Starts AssemblyAI processing from the uploaded S3 object.
 */
router.post('/complete',
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ error: 'Missing jobId' });
      }

      // Fetch job and verify access
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM audio_jobs WHERE id = ?',
        [jobId]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }
      const job = rows[0];

      const accessCheckResult = await validateUploadAccess(req, job.teacher_id, job.school_id);
      if (!accessCheckResult.allowed) {
        return res.status(403).json({ error: accessCheckResult.error });
      }

      if (!job.s3_key) {
        return res.status(400).json({ error: 'No S3 key associated with job; cannot start processing' });
      }

      // Transition to queued, then enqueue processing from S3
      await pool.execute(
        'UPDATE audio_jobs SET status = ? WHERE id = ?',
        ['queued', jobId]
      );

      await processingService.enqueueJobFromS3(jobId);

      res.json({ jobId, status: 'queued', message: 'Upload complete. Processing has started.' });
    } catch (error) {
      console.error('Upload complete error:', error);
      res.status(500).json({ error: 'Failed to mark upload complete' });
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
