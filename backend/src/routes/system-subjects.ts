import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all system subjects (Super Admin only)
router.get('/', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        ss.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM system_subjects ss
      LEFT JOIN users u ON ss.created_by = u.id
      WHERE ss.is_active = TRUE
      ORDER BY ss.category, ss.subject_name
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching system subjects:', error);
    res.status(500).json({ error: 'Failed to fetch system subjects' });
  }
});

// Create new system subject (Super Admin only)
router.post('/', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { subject_name, description, category = 'General' } = req.body;
    const user = (req as any).user;

    if (!subject_name) {
      return res.status(400).json({ 
        error: 'Subject name is required' 
      });
    }

    // Check if subject already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM system_subjects WHERE subject_name = ?',
      [subject_name]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: 'System subject already exists' });
    }

    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO system_subjects (subject_name, description, category, created_by) 
      VALUES (?, ?, ?, ?)
    `, [subject_name, description, category, user.id]);

    res.status(201).json({
      id: result.insertId,
      subject_name,
      description,
      category,
      message: 'System subject created successfully'
    });
  } catch (error) {
    console.error('Error creating system subject:', error);
    res.status(500).json({ error: 'Failed to create system subject' });
  }
});

// Update system subject (Super Admin only)
router.put('/:subjectId', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { subject_name, description, category, is_active } = req.body;

    // Check if subject exists
    const [subjectRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM system_subjects WHERE id = ?',
      [subjectId]
    );

    if (!Array.isArray(subjectRows) || subjectRows.length === 0) {
      return res.status(404).json({ error: 'System subject not found' });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    if (subject_name !== undefined) {
      updateFields.push('subject_name = ?');
      values.push(subject_name);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      values.push(category);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(subjectId);

    await pool.execute(
      `UPDATE system_subjects SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    res.json({
      id: subjectId,
      message: 'System subject updated successfully'
    });
  } catch (error) {
    console.error('Error updating system subject:', error);
    res.status(500).json({ error: 'Failed to update system subject' });
  }
});

// Delete system subject (Super Admin only)
router.delete('/:subjectId', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    // Check if subject exists
    const [subjectRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, subject_name FROM system_subjects WHERE id = ?',
      [subjectId]
    );

    if (!Array.isArray(subjectRows) || subjectRows.length === 0) {
      return res.status(404).json({ error: 'System subject not found' });
    }

    // Soft delete by setting is_active to false
    await pool.execute(
      'UPDATE system_subjects SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [subjectId]
    );

    res.json({
      id: subjectId,
      message: 'System subject deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting system subject:', error);
    res.status(500).json({ error: 'Failed to delete system subject' });
  }
});

// Get subject categories
router.get('/categories', authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const [categories] = await pool.execute<RowDataPacket[]>(`
      SELECT DISTINCT category, COUNT(*) as subject_count
      FROM system_subjects 
      WHERE is_active = TRUE
      GROUP BY category
      ORDER BY subject_count DESC, category ASC
    `);

    const defaultCategories = [
      'Core',
      'Sciences', 
      'Social Sciences',
      'Arts',
      'Languages',
      'Technology',
      'Health',
      'General'
    ];

    // Merge with existing categories
    const existingCategories = categories.map((c: any) => c.category);
    const allCategories = Array.from(new Set([
      ...existingCategories,
      ...defaultCategories
    ]));

    res.json({
      categories: allCategories,
      usage: categories
    });
  } catch (error) {
    console.error('Error fetching system subject categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;