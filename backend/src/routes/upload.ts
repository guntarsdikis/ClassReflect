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

// Add middleware to log upload requests before authentication
router.post('/direct', 
  (req: Request, res: Response, next) => {
    console.log('📤 UPLOAD ENDPOINT HIT - Raw request received');
    console.log('📤 Content-Type:', req.get('Content-Type'));
    console.log('📤 Method:', req.method);
    console.log('📤 URL:', req.url);
    console.log('📤 Headers Authorization:', req.get('Authorization') ? 'Present' : 'Missing');
    next();
  },
  authenticate,
  (req: Request, res: Response, next) => {
    console.log('📤 AFTER AUTHENTICATION - Moving to authorize');
    next();
  },
  authorize('teacher', 'school_manager', 'super_admin'),
  (req: Request, res: Response, next) => {
    console.log('📤 AFTER AUTHORIZATION - Moving to multer upload');
    console.log('📤 User role:', req.user?.role);
    next();
  },
  upload.single('audio'), 
  (req: Request, res: Response, next) => {
    console.log('📤 AFTER MULTER - Upload successful, file:', req.file ? req.file.originalname : 'NO FILE');
    next();
  },
  async (req: Request, res: Response) => {
  try {
    console.log('📤 UPLOAD REQUEST RECEIVED');
    console.log('📤 Upload Debug - User:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      schoolId: req.user?.schoolId
    });
    console.log('📤 Upload Debug - Request body keys:', Object.keys(req.body));
    console.log('📤 Upload Debug - File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'NO FILE');
    
    if (!req.file) {
      console.log('❌ Upload Debug - No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Enhanced debugging - log all req.body contents first
    console.log('📤 Upload Debug - Full req.body:', req.body);
    console.log('📤 Upload Debug - req.body keys:', Object.keys(req.body));
    console.log('📤 Upload Debug - req.body values:', Object.values(req.body));
    
    const { teacherId, schoolId, className, subject, grade, duration, notes } = req.body;
    console.log('📤 Upload Debug - Extracted form data:', {
      teacherId, schoolId, className, subject, grade, duration, notes
    });
    console.log('📤 Upload Debug - Form data types:', {
      teacherId: typeof teacherId, 
      schoolId: typeof schoolId, 
      className: typeof className, 
      subject: typeof subject, 
      grade: typeof grade, 
      duration: typeof duration, 
      notes: typeof notes
    });

    if (!teacherId || !schoolId) {
      console.log('❌ Upload Debug - Missing required fields:', { teacherId, schoolId });
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
    console.log('📤 Upload Debug - Generated job ID:', jobId);

    // Process form data - convert empty strings to null, handle undefined
    const processedClassName = className && className.trim() !== '' ? className.trim() : null;
    const processedSubject = subject && subject.trim() !== '' ? subject.trim() : null;
    const processedGrade = grade && grade.trim() !== '' ? grade.trim() : null;
    const processedDuration = duration && !isNaN(parseInt(duration)) ? parseInt(duration) : null;
    const processedNotes = notes && notes.trim() !== '' ? notes.trim() : null;
    
    console.log('📤 Upload Debug - Processed form data for DB:', {
      processedClassName, processedSubject, processedGrade, processedDuration, processedNotes
    });

    // Create job record in database (no S3 involved)
    console.log('📤 Upload Debug - Creating database record...');
    await pool.execute<ResultSetHeader>(
      `INSERT INTO audio_jobs (id, teacher_id, school_id, class_name, subject, grade, class_duration_minutes, notes, file_name, file_size, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [jobId, teacherId, schoolId, processedClassName, processedSubject, processedGrade, processedDuration, processedNotes, req.file.originalname, req.file.size]
    );
    console.log('✅ Upload Debug - Database record created');

    // Start AssemblyAI processing immediately with file buffer
    console.log('📤 Upload Debug - Starting AssemblyAI processing...');
    await processingService.enqueueJob({
      jobId,
      teacherId: parseInt(teacherId),
      schoolId: parseInt(schoolId),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      contentType: req.file.mimetype,
      audioBuffer: req.file.buffer // Pass buffer directly to AssemblyAI
    });
    console.log('✅ Upload Debug - AssemblyAI processing started');

    const response = {
      jobId,
      status: 'queued',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      message: 'File queued for AssemblyAI processing (no S3 storage)'
    };
    console.log('📤 Upload Debug - Sending success response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Upload Debug - Error occurred:', error);
    console.error('❌ Upload Debug - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Error handling middleware for multer errors
router.use('/direct', (error: any, req: Request, res: Response, next: any) => {
  console.log('❌ Upload Debug - Multer/Upload Error occurred:', error);
  
  if (error instanceof MulterError) {
    console.log('❌ Upload Debug - Multer Error:', {
      code: error.code,
      field: error.field,
      message: error.message
    });
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field. Expected "audio".' });
    }
    return res.status(400).json({ error: `Upload error: ${error.message}` });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  console.log('❌ Upload Debug - Unknown upload error:', error);
  return res.status(500).json({ error: 'Upload failed' });
});

// Note: Confirm endpoint removed - no longer needed without presigned URLs

export default router;