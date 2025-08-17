import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Get all jobs for a teacher
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        aj.*,
        CONCAT(IFNULL(t.first_name, ''), ' ', IFNULL(t.last_name, '')) as teacher_name,
        s.name as school_name,
        tr.transcript_text as transcript_content,
        tr.word_count,
        tr.confidence_score
      FROM audio_jobs aj
      JOIN teachers t ON aj.teacher_id = t.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      WHERE aj.teacher_id = ?
    `;
    
    const params: any[] = [teacherId];

    if (status) {
      query += ' AND aj.status = ?';
      params.push(status);
    }

    query += ' ORDER BY aj.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    res.json({
      jobs: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job details
router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        aj.*,
        CONCAT(IFNULL(t.first_name, ''), ' ', IFNULL(t.last_name, '')) as teacher_name,
        t.email as teacher_email,
        s.name as school_name,
        tr.transcript_text as transcript_content,
        tr.word_count,
        ar.score,
        ar.feedback
      FROM audio_jobs aj
      JOIN teachers t ON aj.teacher_id = t.id
      JOIN schools s ON aj.school_id = s.id
      LEFT JOIN transcripts tr ON aj.id = tr.job_id
      LEFT JOIN analysis_results ar ON aj.id = ar.job_id
      WHERE aj.id = ?`,
      [jobId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// Update job status (for testing/admin)
router.patch('/:jobId/status', async (req: Request, res: Response) => {
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
router.get('/stats/:schoolId', async (req: Request, res: Response) => {
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