import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { authenticate, authorize } from '../middleware/auth-cognito';
import { lemurService } from '../services/lemur';

const router = Router();
let pool: Pool;

export const initializeAnalysisRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

/**
 * Background job processor for analysis tasks
 * Handles the actual AI processing in the background
 */
async function processAnalysisJob(analysisJobId: string): Promise<void> {
  console.log(`🔄 Starting background processing for analysis job ${analysisJobId}`);
  
  try {
    // Update job status to processing
    await pool.execute(`
      UPDATE analysis_jobs 
      SET status = 'processing', started_at = NOW(), progress_percent = 10 
      WHERE id = ?
    `, [analysisJobId]);

    // Get job details with transcript and template information
    const [jobRows] = await pool.execute(`
      SELECT 
        aj.*,
        t.external_id,
        t.transcript_text,
        tpl.template_name,
        tc.criteria_name,
        tc.weight,
        tc.criteria_description as prompt_template,
        u.first_name,
        u.last_name,
        auj.class_name,
        auj.subject,
        auj.grade
      FROM analysis_jobs aj
      JOIN transcripts t ON aj.transcript_id = t.id
      JOIN templates tpl ON aj.template_id = tpl.id
      LEFT JOIN template_criteria tc ON tpl.id = tc.template_id AND tc.is_active = 1
      JOIN users u ON aj.teacher_id = u.id
      JOIN audio_jobs auj ON aj.job_id = auj.id
      WHERE aj.id = ?
      ORDER BY tc.order_index
    `, [analysisJobId]);

    if (!Array.isArray(jobRows) || jobRows.length === 0) {
      throw new Error(`Analysis job ${analysisJobId} not found`);
    }

    const job = jobRows[0] as any;
    const criterions = jobRows
      .filter((row: any) => row.criteria_name)
      .map((row: any) => ({
        criteria_name: row.criteria_name,
        weight: row.weight,
        prompt_template: row.prompt_template
      }));

    if (criterions.length === 0) {
      throw new Error('Template has no active criterions');
    }

    console.log(`📊 Processing analysis for transcript ${job.transcript_id} with template "${job.template_name}"`);
    console.log(`📝 Using ${criterions.length} criterions:`, criterions.map((c: any) => c.criteria_name));

    // Update progress
    await pool.execute(`
      UPDATE analysis_jobs SET progress_percent = 30 WHERE id = ?
    `, [analysisJobId]);

    // Perform AI analysis using LeMUR with template criterions
    const analysisResults = await lemurService.analyzeWithTemplate(
      job.external_id, // AssemblyAI transcript ID
      job.template_name,
      criterions,
      {
        className: job.class_name || 'Class',
        subject: job.subject || 'Subject',
        grade: job.grade || 'Grade',
        teacherName: `${job.first_name} ${job.last_name}`
      }
    );

    // Update progress
    await pool.execute(`
      UPDATE analysis_jobs SET progress_percent = 80 WHERE id = ?
    `, [analysisJobId]);

    // Save analysis results to both analysis_jobs and analysis_results tables
    await pool.execute(`
      UPDATE analysis_jobs 
      SET 
        status = 'completed',
        progress_percent = 100,
        completed_at = NOW(),
        overall_score = ?,
        strengths = ?,
        improvements = ?,
        detailed_feedback = ?
      WHERE id = ?
    `, [
      analysisResults.overall_score,
      JSON.stringify(analysisResults.strengths),
      JSON.stringify(analysisResults.improvements),
      JSON.stringify(analysisResults.detailed_feedback),
      analysisJobId
    ]);

    // Also save to analysis_results for backward compatibility
    await pool.execute(`
      INSERT INTO analysis_results (
        transcript_id, job_id, teacher_id, school_id, template_id, applied_by,
        overall_score, strengths, improvements, detailed_feedback, ai_model
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'anthropic/claude-sonnet-4-20250514')
    `, [
      job.transcript_id,
      job.job_id,
      job.teacher_id,
      job.school_id,
      job.template_id,
      job.applied_by,
      analysisResults.overall_score,
      JSON.stringify(analysisResults.strengths),
      JSON.stringify(analysisResults.improvements),
      JSON.stringify(analysisResults.detailed_feedback)
    ]);

    console.log(`✅ Analysis job ${analysisJobId} completed successfully`);

  } catch (error) {
    console.error(`❌ Analysis job ${analysisJobId} failed:`, error);
    
    // Update job status to failed
    await pool.execute(`
      UPDATE analysis_jobs 
      SET 
        status = 'failed',
        completed_at = NOW(),
        error_message = ?
      WHERE id = ?
    `, [
      error instanceof Error ? error.message : String(error),
      analysisJobId
    ]);
    
    throw error;
  }
}

/**
 * GET /api/analysis/recordings
 * Get recordings available for analysis (with transcripts)
 */
router.get('/recordings', 
  authenticate, 
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.role === 'super_admin' 
        ? req.query.schoolId 
        : req.user!.schoolId;

      let query = `
        SELECT 
          aj.id as job_id,
          aj.teacher_id,
          aj.class_name,
          aj.subject,
          aj.grade,
          aj.class_duration_minutes,
          aj.notes,
          aj.file_name,
          aj.created_at as uploaded_at,
          u.first_name as teacher_first_name,
          u.last_name as teacher_last_name,
          t.id as transcript_id,
          t.transcript_text,
          t.word_count,
          t.confidence_score,
          COUNT(DISTINCT ar.id) as analysis_count,
          CASE WHEN COUNT(DISTINCT ar.id) > 0 THEN 1 ELSE 0 END as has_analysis
        FROM audio_jobs aj
        JOIN users u ON aj.teacher_id = u.id
        LEFT JOIN transcripts t ON aj.id = t.job_id
        LEFT JOIN analysis_results ar ON t.id = ar.transcript_id
        WHERE aj.status = 'completed' 
          AND t.transcript_text IS NOT NULL
      `;

      const params = [];
      
      if (schoolId) {
        query += ' AND aj.school_id = ?';
        params.push(schoolId);
      }

      query += ' GROUP BY aj.id, t.id ORDER BY aj.created_at DESC LIMIT 50';

      const [rows] = await pool.execute(query, params);
      
      res.json(rows);
    } catch (error) {
      console.error('Get recordings error:', error);
      res.status(500).json({ error: 'Failed to get recordings' });
    }
  }
);

/**
 * POST /api/analysis/apply-template
 * Apply a template to analyze a recording
 */
router.post('/apply-template',
  authenticate,
  authorize('school_manager', 'super_admin'), 
  async (req: Request, res: Response) => {
    console.log('🔥 ANALYSIS APPLY-TEMPLATE ROUTE HIT!');
    console.log('   Method:', req.method);
    console.log('   Path:', req.path);
    console.log('   Body:', req.body);
    console.log('   User:', (req as any).user?.id, (req as any).user?.email);
    
    try {
      const { transcriptId, templateId } = req.body;

      if (!transcriptId || !templateId) {
        console.log('❌ Missing required fields:', { transcriptId, templateId });
        return res.status(400).json({ error: 'Transcript ID and Template ID are required' });
      }

      console.log('📋 Getting transcript details for ID:', transcriptId);
      
      // Get transcript details including external_id for AssemblyAI
      const [transcriptRows] = await pool.execute(`
        SELECT t.*, aj.teacher_id, aj.school_id, aj.class_name, aj.subject, aj.grade,
               u.first_name, u.last_name
        FROM transcripts t
        JOIN audio_jobs aj ON t.job_id = aj.id
        JOIN users u ON aj.teacher_id = u.id
        WHERE t.id = ?
      `, [transcriptId]);

      console.log('📋 Transcript query result:', Array.isArray(transcriptRows) ? transcriptRows.length : 'not array', transcriptRows);

      if (!Array.isArray(transcriptRows) || transcriptRows.length === 0) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      const transcript = transcriptRows[0] as any;
      console.log('🔒 Checking access permissions...');
      console.log('   User role:', req.user!.role);
      console.log('   User school_id:', req.user!.schoolId);
      console.log('   Transcript school_id:', transcript.school_id);

      // Verify school access
      if (req.user!.role !== 'super_admin' && transcript.school_id !== req.user!.schoolId) {
        console.log('❌ Access denied - school mismatch');
        return res.status(403).json({ error: 'Access denied' });
      }
      
      console.log('✅ Access permission granted');

      console.log('📝 Getting template details for ID:', templateId);
      
      // Get template details and criterions
      const [templateRows] = await pool.execute(`
        SELECT t.template_name, t.description, tc.criteria_name, tc.weight, tc.criteria_description as prompt_template
        FROM templates t
        LEFT JOIN template_criteria tc ON t.id = tc.template_id AND tc.is_active = 1
        WHERE t.id = ? AND t.is_active = 1
        ORDER BY tc.order_index
      `, [templateId]);
      
      console.log('📝 Template query result:', Array.isArray(templateRows) ? templateRows.length : 'not array', templateRows);

      if (!Array.isArray(templateRows) || templateRows.length === 0) {
        return res.status(404).json({ error: 'Template not found or inactive' });
      }

      const template = templateRows[0] as any;
      const criterions = templateRows
        .filter((row: any) => row.criteria_name) // Only include rows with criterions
        .map((row: any) => ({
          criteria_name: row.criteria_name,
          weight: row.weight,
          prompt_template: row.prompt_template
        }));

      if (criterions.length === 0) {
        return res.status(400).json({ error: 'Template has no active criterions' });
      }
      
      // Allow multiple analyses - users can analyze the same recording with different templates
      // or re-analyze with the same template to compare results over time
      console.log(`📊 Proceeding with analysis - multiple analyses per recording are allowed`);

      // Create background analysis job instead of processing immediately
      console.log(`🔄 Creating background analysis job for transcript ${transcriptId} with template "${template.template_name}"`);
      
      const [jobResult] = await pool.execute(`
        INSERT INTO analysis_jobs (
          transcript_id, template_id, teacher_id, school_id, job_id, applied_by,
          status, progress_percent, queued_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'queued', 0, NOW())
      `, [
        transcriptId,
        templateId,
        transcript.teacher_id,
        transcript.school_id,
        transcript.job_id,
        req.user!.id
      ]);

      const analysisJobId = (jobResult as any).insertId;

      // Update template usage count
      await pool.execute(`
        UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?
      `, [templateId]);

      console.log(`✅ Analysis job created with ID ${analysisJobId} and queued for processing`);

      // Start background processing (fire-and-forget)
      console.log(`🚀 Starting background processing for job ${analysisJobId}`);
      processAnalysisJob(analysisJobId).catch(error => {
        console.error(`❌ Background processing failed for job ${analysisJobId}:`, error);
      });

      const response = {
        analysisJobId,
        status: 'queued',
        message: 'Analysis job created and queued for processing',
        estimatedTimeMinutes: '1-3 minutes'
      };

      console.log('🚀 Sending immediate response:', response);
      res.json(response);

    } catch (error) {
      console.error('❌ Apply template error:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      
      // Send error response
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to apply template analysis' });
      } else {
        console.error('❌ Headers already sent - cannot send error response');
      }
    }
  }
);

/**
 * GET /api/analysis/results/:transcriptId
 * Get analysis results for a transcript
 */
router.get('/results/:transcriptId',
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { transcriptId } = req.params;

      const [rows] = await pool.execute(`
        SELECT 
          ar.*,
          t.template_name,
          t.description as template_description,
          u1.first_name as teacher_first_name,
          u1.last_name as teacher_last_name,
          u2.first_name as applied_by_first_name,
          u2.last_name as applied_by_last_name,
          aj.class_name,
          aj.subject,
          aj.grade,
          aj.file_name
        FROM analysis_results ar
        LEFT JOIN templates t ON ar.template_id = t.id
        LEFT JOIN users u1 ON ar.teacher_id = u1.id
        LEFT JOIN users u2 ON ar.applied_by = u2.id
        LEFT JOIN transcripts tr ON ar.transcript_id = tr.id
        LEFT JOIN audio_jobs aj ON ar.job_id = aj.id
        WHERE ar.transcript_id = ?
      `, [transcriptId]);

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'No analysis results found' });
      }

      // Verify access rights
      const result = rows[0] as any;
      if (req.user!.role === 'teacher' && result.teacher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role === 'school_manager' && result.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Parse JSON fields with error handling
      const analysisResults = rows.map((row: any) => {
        const result = { ...row };
        
        // Smart JSON parsing - check if already parsed by MySQL
        if (typeof row.strengths === 'string' && row.strengths) {
          try {
            result.strengths = JSON.parse(row.strengths);
          } catch (error) {
            console.warn(`Failed to parse strengths string for analysis ${row.id}:`, error);
            result.strengths = [];
          }
        } else {
          // Already parsed by MySQL or null/undefined
          result.strengths = Array.isArray(row.strengths) ? row.strengths : [];
        }
        
        if (typeof row.improvements === 'string' && row.improvements) {
          try {
            result.improvements = JSON.parse(row.improvements);
          } catch (error) {
            console.warn(`Failed to parse improvements string for analysis ${row.id}:`, error);
            result.improvements = [];
          }
        } else {
          // Already parsed by MySQL or null/undefined
          result.improvements = Array.isArray(row.improvements) ? row.improvements : [];
        }
        
        if (typeof row.detailed_feedback === 'string' && row.detailed_feedback) {
          try {
            result.detailed_feedback = JSON.parse(row.detailed_feedback);
          } catch (error) {
            console.warn(`Failed to parse detailed_feedback string for analysis ${row.id}:`, error);
            result.detailed_feedback = {};
          }
        } else {
          // Already parsed by MySQL or null/undefined
          result.detailed_feedback = (typeof row.detailed_feedback === 'object' && row.detailed_feedback) ? row.detailed_feedback : {};
        }
        
        return result;
      });

      res.json(analysisResults);
    } catch (error) {
      console.error('Get analysis results error:', error);
      res.status(500).json({ error: 'Failed to get analysis results' });
    }
  }
);

/**
 * GET /api/analysis/school-summary
 * Get analysis summary for school (School Manager and Super Admin)
 */
router.get('/school-summary',
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.role === 'super_admin' 
        ? req.query.schoolId 
        : req.user!.schoolId;

      if (!schoolId) {
        return res.status(400).json({ error: 'School ID is required' });
      }

      // Get summary statistics
      const [summaryRows] = await pool.execute(`
        SELECT 
          COUNT(*) as total_analyses,
          AVG(overall_score) as average_score,
          MIN(overall_score) as min_score,
          MAX(overall_score) as max_score,
          COUNT(DISTINCT teacher_id) as teachers_analyzed
        FROM analysis_results 
        WHERE school_id = ?
      `, [schoolId]);

      // Get recent analyses
      const [recentRows] = await pool.execute(`
        SELECT 
          ar.id,
          ar.overall_score,
          ar.created_at,
          t.template_name,
          u.first_name as teacher_first_name,
          u.last_name as teacher_last_name,
          aj.class_name,
          aj.subject
        FROM analysis_results ar
        LEFT JOIN templates t ON ar.template_id = t.id
        LEFT JOIN users u ON ar.teacher_id = u.id
        LEFT JOIN audio_jobs aj ON ar.job_id = aj.id
        WHERE ar.school_id = ?
        ORDER BY ar.created_at DESC
        LIMIT 10
      `, [schoolId]);

      // Get template usage stats
      const [templateStats] = await pool.execute(`
        SELECT 
          t.template_name,
          COUNT(*) as usage_count,
          AVG(ar.overall_score) as average_score
        FROM analysis_results ar
        JOIN templates t ON ar.template_id = t.id
        WHERE ar.school_id = ?
        GROUP BY ar.template_id, t.template_name
        ORDER BY usage_count DESC
      `, [schoolId]);

      res.json({
        summary: Array.isArray(summaryRows) ? summaryRows[0] : null,
        recentAnalyses: recentRows,
        templateUsage: templateStats
      });

    } catch (error) {
      console.error('Get school summary error:', error);
      res.status(500).json({ error: 'Failed to get school analysis summary' });
    }
  }
);

/**
 * GET /api/analysis/job-status/:jobId
 * Get status of background analysis job
 */
router.get('/job-status/:jobId',
  authenticate,
  authorize('teacher', 'school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const [rows] = await pool.execute(`
        SELECT 
          aj.id,
          aj.status,
          aj.progress_percent,
          aj.queued_at,
          aj.started_at,
          aj.completed_at,
          aj.error_message,
          aj.overall_score,
          tpl.template_name,
          tpl.category as template_category,
          u1.first_name as teacher_first_name,
          u1.last_name as teacher_last_name,
          u2.first_name as applied_by_first_name,
          u2.last_name as applied_by_last_name,
          tr.word_count,
          auj.class_name,
          auj.subject,
          auj.grade
        FROM analysis_jobs aj
        LEFT JOIN templates tpl ON aj.template_id = tpl.id
        LEFT JOIN users u1 ON aj.teacher_id = u1.id
        LEFT JOIN users u2 ON aj.applied_by = u2.id
        LEFT JOIN transcripts tr ON aj.transcript_id = tr.id
        LEFT JOIN audio_jobs auj ON aj.job_id = auj.id
        WHERE aj.id = ?
      `, [jobId]);

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'Analysis job not found' });
      }

      const job = rows[0] as any;

      // Verify access rights
      if (req.user!.role === 'teacher' && job.teacher_id !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (req.user!.role === 'school_manager' && job.school_id !== req.user!.schoolId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Format the response
      const response = {
        id: job.id,
        status: job.status,
        progress: {
          percent: job.progress_percent,
          message: getProgressMessage(job.status, job.progress_percent)
        },
        timeline: {
          queued_at: job.queued_at,
          started_at: job.started_at,
          completed_at: job.completed_at
        },
        template: {
          name: job.template_name,
          category: job.template_category
        },
        recording: {
          class_name: job.class_name,
          subject: job.subject,
          grade: job.grade,
          word_count: job.word_count
        },
        teacher: {
          first_name: job.teacher_first_name,
          last_name: job.teacher_last_name
        },
        applied_by: job.applied_by_first_name ? {
          first_name: job.applied_by_first_name,
          last_name: job.applied_by_last_name
        } : null,
        error_message: job.error_message,
        overall_score: job.overall_score
      };

      res.json(response);
    } catch (error) {
      console.error('Get analysis job status error:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  }
);

/**
 * Helper function to generate progress messages
 */
function getProgressMessage(status: string, progressPercent: number): string {
  switch (status) {
    case 'queued':
      return 'Analysis job is queued and waiting to be processed...';
    case 'processing':
      if (progressPercent < 20) {
        return 'Preparing analysis parameters and template criteria...';
      } else if (progressPercent < 40) {
        return 'Sending transcript data to AI analysis service...';
      } else if (progressPercent < 80) {
        return 'AI is analyzing the teaching performance...';
      } else {
        return 'Finalizing analysis results and saving to database...';
      }
    case 'completed':
      return 'Analysis completed successfully!';
    case 'failed':
      return 'Analysis job failed. Please check error message for details.';
    default:
      return 'Unknown status';
  }
}

export default router;