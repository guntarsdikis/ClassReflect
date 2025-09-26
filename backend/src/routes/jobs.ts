import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket } from 'mysql2';
import { authenticate, authorize, requireTeacherAccess, requireSchoolAccess } from '../middleware/auth';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { processingService } from '../services/processing';
import { assemblyAIService } from '../services/assemblyai';

const router = Router();

// Get all recordings list (admin/manager view)
// Super admin sees all recordings, manager sees only their school's recordings
router.get('/recordings', 
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
  try {
    const { status, schoolId, limit = '50', offset = '0', search } = req.query;

    // Ensure we have valid numbers for limit and offset
    const limitNum = parseInt(limit as string, 10) || 50;
    const offsetNum = parseInt(offset as string, 10) || 0;

    // Build the WHERE clause based on role
    let whereClause = '1=1';

    // Role-based filtering
    if (req.user!.role === 'school_manager') {
      // Managers can only see recordings from their school
      whereClause += ` AND aj.school_id = ${pool.escape(req.user!.schoolId)}`;
    } else if (req.user!.role === 'super_admin' && schoolId) {
      // Super admin can optionally filter by school
      whereClause += ` AND aj.school_id = ${pool.escape(parseInt(schoolId as string, 10))}`;
    }

    // Status filtering
    if (status) {
      whereClause += ` AND aj.status = ${pool.escape(status)}`;
    }

    // Search filtering (teacher name or file name)
    if (search) {
      const searchPattern = `%${search}%`;
      whereClause += ` AND (CONCAT(u.first_name, " ", u.last_name) LIKE ${pool.escape(searchPattern)} OR aj.file_name LIKE ${pool.escape(searchPattern)})`;
    }

    // Main query
    const queryStr = `
      SELECT 
        aj.id,
        aj.teacher_id,
        aj.school_id,
        aj.file_name,
        aj.file_size,
        aj.status,
        aj.created_at,
        aj.processing_started_at,
        aj.processing_completed_at,
        aj.error_message,
        aj.assemblyai_upload_url,
        aj.assemblyai_transcript_id,
        aj.class_name,
        aj.subject,
        aj.grade,
        aj.class_duration_minutes,
        aj.notes,
        u.first_name,
        u.last_name,
        u.email as teacher_email,
        s.name as school_name,
        tr.id as transcript_id,
        tr.transcript_text,
        tr.word_count,
        tr.confidence_score,
        tr.external_id as assemblyai_external_id,
        COUNT(DISTINCT ar.id) AS analysis_count,
        MAX(ar.overall_score) AS latest_score
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      LEFT JOIN analysis_results ar ON aj.id = ar.job_id
      WHERE ${whereClause}
      GROUP BY 
        aj.id, aj.teacher_id, aj.school_id, aj.file_name, aj.file_size, aj.status,
        aj.created_at, aj.processing_started_at, aj.processing_completed_at, aj.error_message,
        aj.assemblyai_upload_url, aj.assemblyai_transcript_id, aj.class_name, aj.subject, aj.grade,
        aj.class_duration_minutes, aj.notes, u.first_name, u.last_name, u.email, s.name,
        tr.id, tr.transcript_text, tr.word_count, tr.confidence_score, tr.external_id
      ORDER BY aj.created_at DESC 
      LIMIT ${pool.escape(limitNum)} OFFSET ${pool.escape(offsetNum)}
    `;

    // Query built; removed verbose SQL debug logging

    const [rows] = await pool.query<RowDataPacket[]>(queryStr);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      WHERE ${whereClause}
    `;
    
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery);

    // Format the response
    const formattedRows = rows.map((row: any) => ({
      ...row,
      teacher_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      has_transcript: !!row.transcript_text,
      analysis_count: row.analysis_count || 0,
      file_size_mb: row.file_size ? (row.file_size / (1024 * 1024)).toFixed(2) : null
    }));

    res.json({
      recordings: formattedRows,
      count: formattedRows.length,
      total: countResult[0].total,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < countResult[0].total
      }
    });
  } catch (error) {
    console.error('Error fetching recordings list:', error);
    res.status(500).json({ error: 'Failed to fetch recordings list' });
  }
});

// Get all jobs for a teacher
// Teachers can only see their own jobs, managers can see jobs for teachers in their school
router.get('/teacher/:teacherId', 
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  requireTeacherAccess,
  async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { status, limit = '50', offset = '0' } = req.query;

    // Debug logging
    console.log('Request params:', { teacherId, status, limit, offset });

    // Ensure we have valid numbers for limit and offset
    const limitNum = parseInt(limit as string, 10) || 50;
    const offsetNum = parseInt(offset as string, 10) || 0;
    const teacherIdNum = parseInt(teacherId, 10);

    if (isNaN(teacherIdNum)) {
      return res.status(400).json({ error: 'Invalid teacher ID' });
    }

    // School isolation for managers - they can only access teachers in their school
    if (req.user!.role === 'school_manager') {
      // First check if the target teacher exists and is in the manager's school
      const [teacherRows] = await pool.execute<RowDataPacket[]>(
        'SELECT school_id FROM users WHERE id = ? AND is_active = true',
        [teacherIdNum]
      );
      
      if (teacherRows.length === 0) {
        return res.status(403).json({ error: 'Access denied - teacher not found or not in your school' });
      }
      
      const teacherSchoolId = teacherRows[0].school_id;
      if (teacherSchoolId !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied - teacher not in your school' });
      }
    }

    // Use query instead of execute to avoid prepared statement issues
    let queryStr = `
      SELECT 
        aj.id,
        aj.teacher_id,
        aj.school_id,
        aj.file_name,
        aj.file_size,
        aj.status,
        aj.created_at,
        aj.processing_started_at,
        aj.processing_completed_at,
        aj.error_message,
        aj.class_name,
        aj.subject,
        aj.grade,
        aj.class_duration_minutes as duration_minutes,
        aj.notes,
        u.first_name,
        u.last_name,
        s.name as school_name,
        tr.id as transcript_id,
        tr.transcript_text as transcript_content,
        tr.word_count,
        tr.confidence_score,
        COUNT(DISTINCT ar.id) as analysis_count,
        CASE WHEN COUNT(DISTINCT ar.id) > 0 THEN 1 ELSE 0 END as has_analysis,
        MAX(ar.overall_score) as latest_score
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      LEFT JOIN analysis_results ar ON aj.id = ar.job_id
      WHERE aj.teacher_id = ${pool.escape(teacherIdNum)}
    `;

    if (status) {
      queryStr += ` AND aj.status = ${pool.escape(status)}`;
    }

    queryStr += ` GROUP BY aj.id, aj.teacher_id, aj.school_id, aj.file_name, aj.file_size, aj.status, aj.created_at, aj.processing_started_at, aj.processing_completed_at, aj.error_message, aj.class_name, aj.subject, aj.grade, aj.class_duration_minutes, aj.notes, u.first_name, u.last_name, s.name, tr.id, tr.transcript_text, tr.word_count, tr.confidence_score`;
    queryStr += ` ORDER BY aj.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    // Run the query
    
    const [rows] = await pool.query<RowDataPacket[]>(queryStr);

    // Format the response to include teacher_name
    const formattedRows = rows.map((row: any) => ({
      ...row,
      teacher_name: `${row.first_name || ''} ${row.last_name || ''}`.trim()
    }));

    res.json({
      jobs: formattedRows,
      count: formattedRows.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job details
// Users can only see jobs they have access to (own jobs for teachers, school jobs for managers)
router.get('/:jobId', 
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        aj.*,
        u.first_name,
        u.last_name,
        u.email as teacher_email,
        s.name as school_name,
        tr.transcript_text as transcript_content,
        tr.word_count,
        ar.score,
        ar.feedback
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      LEFT JOIN analysis_results ar ON aj.id = ar.job_id
      WHERE aj.id = ?`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = rows[0];
    
    // Role-based access control
    if (req.user!.role === 'teacher') {
      // Teachers can only see their own jobs
      if (job.teacher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user!.role === 'school_manager') {
      // Managers can only see jobs from their school
      if (job.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // Super admins can see any job (no additional checks)

    // Format the response to include teacher_name
    const formattedRow = {
      ...rows[0],
      teacher_name: `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim()
    };

    res.json(formattedRow);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// Update job status (for testing/admin)
// Update job status (system processes only - super admin or processing system)
router.patch('/:jobId/status', 
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { status, errorMessage } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'uploading', 'queued', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let updateQuery = 'UPDATE audio_jobs SET status = ?';
    const params: any[] = [status];

    if (status === 'processing') {
      updateQuery += ', processing_started_at = NOW()';
    } else if (status === 'completed') {
      updateQuery += ', processing_completed_at = NOW()';
    } else if (status === 'failed' && errorMessage) {
      updateQuery += ', error_message = ?';
      params.push(errorMessage);
    }

    updateQuery += ' WHERE id = ?';
    params.push(jobId);

    await pool.execute(updateQuery, params);

    res.json({
      jobId,
      status,
      message: 'Job status updated successfully'
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Get job statistics
// Get school statistics 
// Only managers and super admins can see school stats
router.get('/stats/:schoolId', 
  authenticate,
  authorize('school_manager', 'super_admin'),
  requireSchoolAccess,
  async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
        SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END) as pending_jobs,
        AVG(TIMESTAMPDIFF(SECOND, processing_started_at, processing_completed_at)) as avg_processing_time
      FROM audio_jobs
      WHERE school_id = ?`,
      [schoolId]
    );

    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Delete recording and all associated data
// Only managers and super admins can delete, with proper access controls
router.delete('/:jobId', 
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // First, get the recording details to check permissions and get file info
    const [jobRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        aj.*,
        u.first_name,
        u.last_name,
        s.name as school_name,
        tr.id as transcript_id,
        tr.external_id as assemblyai_external_id
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      WHERE aj.id = ?`,
      [jobId]
    );

    if (jobRows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const job = jobRows[0] as any;
    
    // Role-based access control - only school managers can delete recordings from their school
    if (req.user!.role === 'school_manager') {
      if (job.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied - recording not in your school' });
      }
    }
    // Super admins can delete any recording (no additional checks)

    console.log(`🗑️ Starting deletion of recording ${jobId}:`, {
      class_name: job.class_name,
      teacher: `${job.first_name} ${job.last_name}`,
      school: job.school_name,
      file_name: job.file_name,
      s3_key: job.s3_key,
      has_transcript: !!job.transcript_id
    });

    // Start transaction for database operations
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete analysis results first (if any)
      const [analysisResult] = await connection.execute(
        'DELETE FROM analysis_results WHERE job_id = ?',
        [jobId]
      );
      console.log(`📊 Deleted ${(analysisResult as any).affectedRows} analysis results`);

      // Delete analysis jobs (if any)
      const [analysisJobsResult] = await connection.execute(
        'DELETE FROM analysis_jobs WHERE job_id = ?',
        [jobId]
      );
      console.log(`🔄 Deleted ${(analysisJobsResult as any).affectedRows} analysis jobs`);

      // Delete word-level timestamps (if exists)
      try {
        const [wtRes] = await connection.execute(
          'DELETE FROM word_timestamps WHERE job_id = ?',
          [jobId]
        );
        console.log(`🕒 Deleted ${(wtRes as any).affectedRows || 0} word timestamp rows`);
      } catch (wtErr: any) {
        // Table may not exist in some environments; log and continue
        console.warn('⚠️ word_timestamps cleanup skipped or failed:', wtErr?.message || wtErr);
      }

      // Delete transcript (if exists)
      if (job.transcript_id) {
        const [transcriptResult] = await connection.execute(
          'DELETE FROM transcripts WHERE job_id = ?',
          [jobId]
        );
        console.log(`📝 Deleted ${(transcriptResult as any).affectedRows} transcript records`);
      }

      // Delete the main audio job record
      const [jobResult] = await connection.execute(
        'DELETE FROM audio_jobs WHERE id = ?',
        [jobId]
      );

      if ((jobResult as any).affectedRows === 0) {
        throw new Error('Failed to delete audio job record');
      }

      console.log(`🎵 Deleted audio job record ${jobId}`);

      // Commit database transaction
      await connection.commit();
      console.log('✅ Database deletion completed successfully');

    } catch (dbError) {
      // Rollback transaction on database error
      await connection.rollback();
      console.error('❌ Database deletion failed, rolling back:', dbError);
      throw dbError;
    } finally {
      connection.release();
    }

    // Delete file from S3 (if s3_key exists)
    if (job.s3_key) {
      try {
        const s3Client = new S3Client({ 
          region: process.env.AWS_REGION || 'eu-west-2' 
        });
        
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'classreflect-audio-files-573524060586',
          Key: job.s3_key
        });
        
        await s3Client.send(deleteCommand);
        
        console.log(`🗑️ Successfully deleted S3 file: ${job.s3_key}`);
      } catch (s3Error) {
        console.error(`⚠️ Failed to delete S3 file ${job.s3_key}:`, s3Error);
        // Don't fail the entire operation if S3 deletion fails
        // The database records are already deleted, so this is just cleanup
      }
    } else {
      console.log('ℹ️ No S3 key found, skipping file deletion');
    }

    // Log the deletion for audit purposes
    console.log(`✅ Recording deletion completed:`, {
      jobId,
      class_name: job.class_name,
      teacher: `${job.first_name} ${job.last_name}`,
      school: job.school_name,
      deleted_by: req.user!.id,
      deleted_by_email: req.user!.email,
      deleted_at: new Date().toISOString()
    });

    res.json({
      message: 'Recording deleted successfully',
      deletedRecording: {
        jobId,
        class_name: job.class_name,
        teacher_name: `${job.first_name} ${job.last_name}`,
        file_name: job.file_name
      }
    });

  } catch (error) {
    console.error('❌ Recording deletion failed:', error);
    res.status(500).json({ 
      error: 'Failed to delete recording',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Re-transcribe an existing job (from S3 if available, else via stored AssemblyAI upload URL)
// Teachers: only their own jobs; Managers: jobs in their school; Super admins: any job
router.post('/:jobId/retranscribe',
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      // Load job with minimal fields for access + processing
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, teacher_id, school_id, s3_key, assemblyai_upload_url FROM audio_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Job not found' });
      const job = rows[0];

      // Access control
      if (req.user!.role === 'teacher' && job.teacher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role === 'school_manager' && job.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Clean up existing transcripts and word timestamps to avoid duplicates
      try {
        await pool.execute('DELETE FROM transcripts WHERE job_id = ?', [jobId]);
      } catch {}
      try {
        await pool.execute('DELETE FROM word_timestamps WHERE job_id = ?', [jobId]);
      } catch {}

      // Reset status to queued and clear error
      await pool.execute(
        'UPDATE audio_jobs SET status = ?, error_message = NULL, processing_started_at = NULL, processing_completed_at = NULL WHERE id = ?',
        ['queued', jobId]
      );

      // Prefer S3-based processing if we have an s3_key
      if (job.s3_key) {
        await processingService.enqueueJobFromS3(jobId);
        return res.json({ jobId, mode: 's3', status: 'queued', message: 'Re-transcription started from S3 object' });
      }

      // Otherwise, retry with stored AssemblyAI upload URL (if present)
      if (job.assemblyai_upload_url) {
        await assemblyAIService.retryTranscription(jobId);
        return res.json({ jobId, mode: 'assemblyai_url', status: 'processing', message: 'Re-transcription retried via AssemblyAI upload URL' });
      }

      return res.status(400).json({ error: 'No source available to retranscribe (missing s3_key and upload URL)' });
    } catch (err) {
      console.error('Retranscribe error:', err);
      return res.status(500).json({ error: 'Failed to start re-transcription' });
    }
  }
);

// Download recording file (Super Admin only)
router.get('/:jobId/download',
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // Get job details including S3 information
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        aj.id,
        aj.teacher_id,
        aj.school_id,
        aj.file_name,
        aj.file_size,
        aj.s3_key,
        aj.status,
        u.first_name,
        u.last_name,
        s.name as school_name
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      WHERE aj.id = ?`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const job = rows[0] as any;

    // Check if file exists in S3
    if (!job.s3_key) {
      return res.status(404).json({
        error: 'No file available for download. This recording may have been processed without S3 storage.'
      });
    }

    console.log(`📥 Super admin download request for job ${jobId}:`, {
      file_name: job.file_name,
      teacher: `${job.first_name} ${job.last_name}`,
      school: job.school_name,
      s3_key: job.s3_key,
      requested_by: req.user?.email
    });

    // Generate presigned download URL for S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-west-2'
    });

    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'classreflect-audio-files-573524060586',
      Key: job.s3_key,
      // Force download instead of inline viewing
      ResponseContentDisposition: `attachment; filename="${job.file_name}"`
    });

    // Generate presigned URL valid for 1 hour
    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600
    });

    // Log the download for audit purposes
    console.log(`✅ Download URL generated for recording:`, {
      jobId,
      class_name: job.class_name,
      teacher: `${job.first_name} ${job.last_name}`,
      school: job.school_name,
      file_name: job.file_name,
      downloaded_by: req.user!.id,
      downloaded_by_email: req.user!.email,
      download_requested_at: new Date().toISOString()
    });

    res.json({
      downloadUrl,
      fileName: job.file_name,
      fileSize: job.file_size,
      expiresIn: 3600, // 1 hour
      recording: {
        jobId: job.id,
        teacherName: `${job.first_name} ${job.last_name}`,
        schoolName: job.school_name,
        className: job.class_name || 'N/A'
      }
    });

  } catch (error) {
    console.error('❌ Recording download failed:', error);
    res.status(500).json({
      error: 'Failed to generate download link',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Helper formatters for timecoded exports
function formatSrtTime(seconds: number): string {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const ms = msTotal % 1000;
  const totalSeconds = Math.floor(msTotal / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const ms = msTotal % 1000;
  const totalSeconds = Math.floor(msTotal / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}

// Download timecoded transcript (super admin only)
router.get('/:jobId/transcript/download',
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { format = 'csv' } = req.query as { format?: string };

      // Validate job exists
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, file_name, class_name FROM audio_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );
      if (!jobRows.length) return res.status(404).json({ error: 'Job not found' });
      const job = jobRows[0] as any;

      // Load word timestamps
      let words: Array<{ word_index: number; word_text: string; start_time: number; end_time: number; confidence: number }>; 
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT word_index, word_text, start_time, end_time, confidence
           FROM word_timestamps
           WHERE job_id = ?
           ORDER BY word_index ASC`,
          [jobId]
        );
        words = (rows as any[]).map(r => ({
          word_index: Number(r.word_index),
          word_text: r.word_text,
          start_time: Number(r.start_time),
          end_time: Number(r.end_time),
          confidence: Number(r.confidence)
        }));
      } catch (err: any) {
        if (err?.code === 'ER_NO_SUCH_TABLE') {
          words = [];
        } else {
          throw err;
        }
      }

      if (!words || words.length === 0) {
        return res.status(400).json({ error: 'No word timestamps available for this recording' });
      }

      const baseName = (job.class_name || job.file_name || `recording_${jobId}`)
        .toString()
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      // Build content by format
      const fmt = (format || 'csv').toString().toLowerCase();

      if (fmt === 'csv') {
        const header = 'word_index,start_time,end_time,word_text,confidence';
        const rows = words.map(w => [
          w.word_index,
          w.start_time.toFixed(3),
          w.end_time.toFixed(3),
          '"' + (w.word_text || '').replace(/"/g, '""') + '"',
          w.confidence.toFixed(4)
        ].join(','));
        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_timecoded.csv"`);
        return res.send(csv);
      }

      if (fmt === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_timecoded.json"`);
        return res.send(JSON.stringify({ jobId, words }, null, 2));
      }

      // Build segments for SRT/VTT/TXT
      const gapThreshold = 1.5; // seconds between segments
      const maxDuration = 10.0; // max segment length in seconds
      type Segment = { start: number; end: number; text: string };
      const segments: Segment[] = [];

      let segStart = words[0].start_time;
      let segEnd = words[0].end_time;
      let buffer: string[] = [words[0].word_text];
      for (let i = 1; i < words.length; i++) {
        const w = words[i];
        const gap = Math.max(0, w.start_time - segEnd);
        const durationIfAdded = Math.max(segEnd, w.end_time) - segStart;
        const shouldBreak = gap >= gapThreshold || durationIfAdded > maxDuration;
        if (shouldBreak) {
          segments.push({ start: segStart, end: segEnd, text: buffer.join(' ') });
          segStart = w.start_time;
          buffer = [w.word_text];
        } else {
          buffer.push(w.word_text);
        }
        segEnd = Math.max(segEnd, w.end_time);
      }
      if (buffer.length) {
        segments.push({ start: segStart, end: segEnd, text: buffer.join(' ') });
      }

      if (fmt === 'srt') {
        const srt = segments.map((s, idx) => `${idx + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n`).join('\n');
        res.setHeader('Content-Type', 'application/x-subrip; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.srt"`);
        return res.send(srt);
      }

      if (fmt === 'vtt') {
        const body = segments.map((s) => `${formatVttTime(s.start)} --> ${formatVttTime(s.end)}\n${s.text}\n`).join('\n');
        const vtt = `WEBVTT\n\n${body}`;
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}.vtt"`);
        return res.send(vtt);
      }

      if (fmt === 'txt') {
        const lines = segments.map(s => `[${formatVttTime(s.start)} - ${formatVttTime(s.end)}] ${s.text}`);
        const txt = lines.join('\n');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_timecoded.txt"`);
        return res.send(txt);
      }

      return res.status(400).json({ error: 'Unsupported format. Use csv|json|srt|vtt|txt' });
    } catch (error) {
      console.error('❌ Transcript download failed:', error);
      res.status(500).json({ error: 'Failed to generate transcript export' });
    }
  }
);

// Get word-level timestamps for a recording (detailed transcript)
// Teachers: only their own jobs; Managers: jobs in their school; Super admins: any job
router.get('/:jobId/word-timestamps',
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      // First load minimal job info for access checks
      const [jobRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, teacher_id, school_id FROM audio_jobs WHERE id = ? LIMIT 1',
        [jobId]
      );

      if (!jobRows.length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobRows[0] as any;

      // Access control mirrors /:jobId route
      if (req.user!.role === 'teacher' && job.teacher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role === 'school_manager' && job.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT word_index, word_text, start_time, end_time, confidence
           FROM word_timestamps
           WHERE job_id = ?
           ORDER BY word_index ASC`,
          [jobId]
        );

        // Shape response
        const words = rows.map((r: any) => ({
          word_index: r.word_index,
          word_text: r.word_text,
          start_time: Number(r.start_time),
          end_time: Number(r.end_time),
          confidence: typeof r.confidence === 'number' ? r.confidence : Number(r.confidence)
        }));

        return res.json({ jobId, count: words.length, words });
      } catch (err: any) {
        if (err?.code === 'ER_NO_SUCH_TABLE') {
          return res.json({ jobId, count: 0, words: [] });
        }
        console.error('Error loading word timestamps:', err);
        return res.status(500).json({ error: 'Failed to load word timestamps' });
      }
    } catch (error) {
      console.error('Error in word-timestamps route:', error);
      res.status(500).json({ error: 'Failed to fetch word timestamps' });
    }
  }
);

export default router;
