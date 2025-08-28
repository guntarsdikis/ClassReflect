import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
// import fs from 'fs/promises'; // Removed - no file storage
// import path from 'path'; // Removed - no file paths needed
import pool from '../database';
// import { storageService } from '../services/storage'; // Removed - AssemblyAI-only system
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

// Note: Presigned URL endpoint removed - AssemblyAI-only direct uploads

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

      // Generate unique job ID
      const jobId = uuidv4();

      // Create job record in database (AssemblyAI-only, no S3/storage)
      await pool.execute<ResultSetHeader>(
        `INSERT INTO audio_jobs (id, teacher_id, school_id, file_name, file_size, status) 
         VALUES (?, ?, ?, ?, ?, 'queued')`,
        [jobId, teacherId, schoolId, req.file.originalname, req.file.size]
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