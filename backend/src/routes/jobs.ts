import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket } from 'mysql2';
import { authenticate, authorize, requireTeacherAccess, requireSchoolAccess } from '../middleware/auth-cognito';

const router = Router();

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
        aj.*,
        u.first_name,
        u.last_name,
        s.name as school_name,
        tr.transcript_text as transcript_content,
        tr.word_count,
        tr.confidence_score
      FROM audio_jobs aj
      JOIN users u ON aj.teacher_id = u.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      WHERE aj.teacher_id = ${pool.escape(teacherIdNum)}
    `;

    if (status) {
      queryStr += ` AND aj.status = ${pool.escape(status)}`;
    }

    queryStr += ` ORDER BY aj.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    console.log('Executing query:', queryStr);
    
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

export default router;