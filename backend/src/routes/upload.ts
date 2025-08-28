import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { MulterError } from 'multer';

// Multer types are already included in @types/multer
import { v4 as uuidv4 } from 'uuid';
import pool from '../database';
import { processingService } from '../services/processing';
import { authenticate, authorize } from '../middleware/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// Configure multer for memory storage (temporary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept audio files only
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

// Note: Presigned URL endpoint removed - all uploads now use direct AssemblyAI processing

// Direct file upload endpoint (for smaller files)
// Teachers can upload their own recordings, managers can upload for any teacher in their school
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

    // Role-based access control
    if (req.user!.role === 'teacher') {
      // Teachers can only upload their own recordings
      if (teacherId !== req.user!.id) {
        return res.status(403).json({ 
          error: 'Teachers can only upload their own recordings' 
        });
      }
      // Ensure teacher is uploading to their own school
      if (schoolId !== req.user!.schoolId) {
        return res.status(403).json({ 
          error: 'School ID mismatch' 
        });
      }
    } else if (req.user!.role === 'school_manager') {
      // Managers can upload for teachers in their school
      if (schoolId !== req.user!.schoolId) {
        return res.status(403).json({ 
          error: 'Managers can only upload for teachers in their school' 
        });
      }
      // Verify the target teacher belongs to the manager's school
      const [teacherCheck] = await pool.execute<RowDataPacket[]>(
        'SELECT school_id FROM users WHERE id = ? AND role = "teacher"',
        [teacherId]
      );
      if (!teacherCheck.length || teacherCheck[0].school_id !== req.user!.schoolId) {
        return res.status(403).json({ 
          error: 'Teacher not found in your school' 
        });
      }
    }
    // Super admins can upload for anyone (no additional checks needed)

    // Generate unique job ID
    const jobId = uuidv4();

    // Create job record in database (no S3 involved)
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audio_jobs (id, teacher_id, school_id, class_name, subject, grade, class_duration_minutes, notes, file_name, file_size, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [jobId, teacherId, schoolId, className || null, subject || null, grade || null, duration || null, notes || null, req.file.originalname, req.file.size]
    );

    // Start AssemblyAI processing immediately with file buffer
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
      message: 'File queued for AssemblyAI processing (no S3 storage)'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Note: Confirm endpoint removed - no longer needed without presigned URLs

export default router;