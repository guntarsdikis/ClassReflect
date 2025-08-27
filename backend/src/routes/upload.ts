import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { MulterError } from 'multer';

// Multer types are already included in @types/multer
import { v4 as uuidv4 } from 'uuid';
import pool from '../database';
import { uploadToS3, generatePresignedUploadUrl, sendToProcessingQueue } from '../services/aws';
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

// Get pre-signed URL for direct upload (recommended for large files)
// Teachers can upload their own recordings, managers can upload for any teacher in their school
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
    const fileExtension = fileName.split('.').pop();
    const s3Key = `audio-files/${schoolId}/${teacherId}/${jobId}.${fileExtension}`;

    // Create job record in database
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO audio_jobs (id, teacher_id, school_id, file_name, s3_key, status) 
       VALUES (?, ?, ?, ?, ?, 'uploading')`,
      [jobId, teacherId, schoolId, fileName, s3Key]
    );

    // Generate pre-signed URL
    const uploadUrl = await generatePresignedUploadUrl(s3Key, fileType);

    res.json({
      jobId,
      uploadUrl,
      s3Key,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

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

    const { teacherId, schoolId } = req.body;

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
    const fileExtension = req.file.originalname.split('.').pop();
    const s3Key = `audio-files/${schoolId}/${teacherId}/${jobId}.${fileExtension}`;

    // Upload to S3
    const s3Url = await uploadToS3(
      s3Key,
      req.file.buffer,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        teacherId: teacherId.toString(),
        schoolId: schoolId.toString(),
        jobId
      }
    );

    // Create job record in database
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audio_jobs (id, teacher_id, school_id, file_name, file_size, file_url, s3_key, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [jobId, teacherId, schoolId, req.file.originalname, req.file.size, s3Url, s3Key]
    );

    // Send to SQS for processing
    const messageId = await sendToProcessingQueue({
      jobId,
      s3Key,
      teacherId: parseInt(teacherId),
      schoolId: parseInt(schoolId)
    });

    // Update job with SQS message ID
    await pool.execute<ResultSetHeader>(
      `UPDATE audio_jobs SET sqs_message_id = ? WHERE id = ?`,
      [messageId, jobId]
    );

    res.json({
      jobId,
      status: 'queued',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      s3Key,
      message: 'File uploaded successfully and queued for processing'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Confirm upload completion (for pre-signed URL uploads)
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { jobId, fileSize } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    // Get job details
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM audio_jobs WHERE id = ?`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = rows[0];

    // Update job status and send to queue
    await pool.execute<ResultSetHeader>(
      `UPDATE audio_jobs SET status = 'queued', file_size = ? WHERE id = ?`,
      [fileSize || null, jobId]
    );

    // Send to SQS for processing
    const messageId = await sendToProcessingQueue({
      jobId,
      s3Key: job.s3_key,
      teacherId: job.teacher_id,
      schoolId: job.school_id
    });

    // Update job with SQS message ID
    await pool.execute<ResultSetHeader>(
      `UPDATE audio_jobs SET sqs_message_id = ? WHERE id = ?`,
      [messageId, jobId]
    );

    res.json({
      jobId,
      status: 'queued',
      message: 'Upload confirmed and file queued for processing'
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    res.status(500).json({ error: 'Failed to confirm upload' });
  }
});

export default router;