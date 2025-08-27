import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticate, authorize } from '../middleware/auth-cognito';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all schools (SuperAdmin only)
router.get('/', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const [schools] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        s.*,
        COUNT(DISTINCT u.id) as total_teachers,
        COUNT(DISTINCT aj.id) as total_uploads,
        COUNT(CASE WHEN aj.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as monthly_uploads,
        sm.first_name as manager_first_name,
        sm.last_name as manager_last_name,
        sm.email as manager_email
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id AND u.role = 'teacher'
      LEFT JOIN audio_jobs aj ON s.id = aj.school_id
      LEFT JOIN users sm ON s.id = sm.school_id AND sm.role = 'school_manager'
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Get single school with detailed stats (SuperAdmin or School Manager)
router.get('/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const user = (req as any).user;

    // Check permissions - SuperAdmin can access any school, Manager only their own
    if (user.role !== 'super_admin' && user.schoolId !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [schools] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        s.*,
        COUNT(DISTINCT u.id) as total_teachers,
        COUNT(DISTINCT aj.id) as total_uploads,
        COUNT(CASE WHEN aj.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as monthly_uploads,
        COUNT(CASE WHEN aj.status = 'processing' THEN 1 END) as processing_jobs,
        sm.first_name as manager_first_name,
        sm.last_name as manager_last_name,
        sm.email as manager_email
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id AND u.role = 'teacher'
      LEFT JOIN audio_jobs aj ON s.id = aj.school_id
      LEFT JOIN users sm ON s.id = sm.school_id AND sm.role = 'school_manager'
      WHERE s.id = ?
      GROUP BY s.id
    `, [schoolId]);

    if (schools.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(schools[0]);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// Create new school (SuperAdmin only)
router.post('/', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      domain,
      contact_email,
      is_active = true,
      max_teachers = 10,
      max_monthly_uploads = 100
    } = req.body;

    if (!name || !contact_email) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, contact_email' 
      });
    }

    // Check if domain already exists
    if (domain) {
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM schools WHERE domain = ?',
        [domain]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Domain already exists' });
      }
    }

    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO schools (
        name, domain, contact_email, is_active, max_teachers, max_monthly_uploads
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [name, domain || null, contact_email, is_active, max_teachers, max_monthly_uploads]);

    res.status(201).json({
      id: result.insertId,
      name,
      domain,
      contact_email,
      is_active,
      message: 'School created successfully'
    });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school (SuperAdmin only)
router.put('/:schoolId', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];

    const allowedFields = [
      'name', 'domain', 'contact_email', 'is_active', 'max_teachers', 'max_monthly_uploads'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Check if domain already exists (if updating domain)
    if (updates.domain) {
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM schools WHERE domain = ? AND id != ?',
        [updates.domain, schoolId]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Domain already exists' });
      }
    }

    values.push(schoolId);

    await pool.execute(
      `UPDATE schools SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    res.json({
      schoolId,
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Delete/suspend school (SuperAdmin only)
router.delete('/:schoolId', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    // Instead of deleting, suspend the school
    await pool.execute(
      `UPDATE schools SET is_active = false, updated_at = NOW() WHERE id = ?`,
      [schoolId]
    );

    res.json({
      schoolId,
      message: 'School suspended successfully'
    });
  } catch (error) {
    console.error('Error suspending school:', error);
    res.status(500).json({ error: 'Failed to suspend school' });
  }
});

// Get platform statistics (SuperAdmin only)
router.get('/admin/stats', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const [stats] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COUNT(DISTINCT s.id) as total_schools,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN aj.status = 'processing' THEN aj.id END) as processing_jobs,
        COUNT(DISTINCT CASE WHEN s.subscription_status = 'active' THEN s.id END) as active_schools,
        COUNT(DISTINCT CASE WHEN s.subscription_status = 'trial' THEN s.id END) as trial_schools,
        COUNT(DISTINCT CASE WHEN s.subscription_status = 'expired' THEN s.id END) as expired_schools
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id
      LEFT JOIN audio_jobs aj ON s.id = aj.school_id AND aj.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

// Get recent platform activity (SuperAdmin only)
router.get('/admin/activity', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const [activities] = await pool.execute<RowDataPacket[]>(`
      (
        SELECT 
          'school_created' as type,
          s.name as school_name,
          s.id as school_id,
          s.subscription_status as status,
          s.created_at as timestamp,
          NULL as manager_name
        FROM schools s
        WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      )
      UNION ALL
      (
        SELECT 
          'user_created' as type,
          s.name as school_name,
          s.id as school_id,
          s.subscription_status as status,
          u.created_at as timestamp,
          CONCAT(u.first_name, ' ', u.last_name) as manager_name
        FROM users u
        JOIN schools s ON u.school_id = s.id
        WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND u.role = 'school_manager'
      )
      UNION ALL
      (
        SELECT 
          'subscription_expired' as type,
          s.name as school_name,
          s.id as school_id,
          s.subscription_status as status,
          s.subscription_expires as timestamp,
          NULL as manager_name
        FROM schools s
        WHERE s.subscription_expires <= NOW() AND s.subscription_expires >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      )
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching platform activity:', error);
    res.status(500).json({ error: 'Failed to fetch platform activity' });
  }
});

// Get school's analysis criteria
router.get('/:schoolId/criteria', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const user = (req as any).user;

    // Check permissions
    if (user.role !== 'super_admin' && user.schoolId !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT * FROM analysis_criteria 
      WHERE school_id = ? AND is_active = TRUE 
      ORDER BY weight DESC
    `, [schoolId]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Failed to fetch analysis criteria' });
  }
});

// Add analysis criterion for school
router.post('/:schoolId/criteria', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { criteria_name, criteria_description, weight = 1.0 } = req.body;
    const user = (req as any).user;

    // Check permissions
    if (user.role !== 'super_admin' && user.schoolId !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!criteria_name) {
      return res.status(400).json({ 
        error: 'Missing required field: criteria_name' 
      });
    }

    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO analysis_criteria (school_id, criteria_name, criteria_description, weight) 
      VALUES (?, ?, ?, ?)
    `, [schoolId, criteria_name, criteria_description, weight]);

    res.status(201).json({
      id: result.insertId,
      schoolId,
      criteria_name,
      message: 'Analysis criterion created successfully'
    });
  } catch (error) {
    console.error('Error creating criterion:', error);
    res.status(500).json({ error: 'Failed to create analysis criterion' });
  }
});

// Update analysis criterion for school
router.put('/:schoolId/criteria/:criterionId', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { schoolId, criterionId } = req.params;
    const { criteria_name, criteria_description, weight = 1.0 } = req.body;
    const user = (req as any).user;

    // Check permissions
    if (user.role !== 'super_admin' && user.schoolId !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!criteria_name) {
      return res.status(400).json({ 
        error: 'Missing required field: criteria_name' 
      });
    }

    await pool.execute(`
      UPDATE analysis_criteria 
      SET criteria_name = ?, criteria_description = ?, weight = ?, updated_at = NOW() 
      WHERE id = ? AND school_id = ?
    `, [criteria_name, criteria_description, weight, criterionId, schoolId]);

    res.json({
      id: criterionId,
      schoolId,
      criteria_name,
      message: 'Analysis criterion updated successfully'
    });
  } catch (error) {
    console.error('Error updating criterion:', error);
    res.status(500).json({ error: 'Failed to update analysis criterion' });
  }
});

// Delete analysis criterion for school (soft delete)
router.delete('/:schoolId/criteria/:criterionId', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { schoolId, criterionId } = req.params;
    const user = (req as any).user;

    // Check permissions
    if (user.role !== 'super_admin' && user.schoolId !== parseInt(schoolId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete by setting is_active to false
    await pool.execute(`
      UPDATE analysis_criteria 
      SET is_active = FALSE, updated_at = NOW() 
      WHERE id = ? AND school_id = ?
    `, [criterionId, schoolId]);

    res.json({
      id: criterionId,
      schoolId,
      message: 'Analysis criterion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting criterion:', error);
    res.status(500).json({ error: 'Failed to delete analysis criterion' });
  }
});

export default router;