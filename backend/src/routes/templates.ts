import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { authenticate, authorize } from '../middleware/auth-cognito';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all templates accessible to user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { category, subject, grade, school_id } = req.query;

    let whereClause = '';
    const params: any[] = [];

    // Build filter conditions
    const conditions: string[] = [];
    
    if (category) {
      conditions.push('t.category = ?');
      params.push(category);
    }
    
    if (subject) {
      conditions.push('JSON_CONTAINS(t.subjects, ?)');
      params.push(`"${subject}"`);
    }
    
    if (grade) {
      conditions.push('JSON_CONTAINS(t.grade_levels, ?)');
      params.push(`"${grade}"`);
    }
    
    if (school_id) {
      conditions.push('t.school_id = ?');
      params.push(parseInt(school_id as string, 10));
    }

    // Access control: SuperAdmin sees all, School Manager sees only own school templates
    console.log('🏫 Template Access Control Debug:');
    console.log('   User:', {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      schoolIdType: typeof user.schoolId
    });
    console.log('   School filter:', school_id);
    
    if (user.role === 'super_admin') {
      if (!school_id) {
        // Super admin without school filter - see all templates
        console.log('   Access: Super Admin - seeing all templates');
        conditions.push('(t.is_global = TRUE OR t.school_id IS NOT NULL)');
      } else {
        // Super admin with school filter - already added school_id condition above
        console.log('   Access: Super Admin - filtering by school_id =', school_id);
      }
    } else {
      // School manager - always filter by their school
      console.log('   Access: School Manager - filtering by school_id =', user.schoolId);
      if (!school_id) {
        // Only add school filter if not already specified
        conditions.push('t.school_id = ?');
        params.push(user.schoolId);
      }
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    console.log('   SQL Query:', `SELECT ... FROM templates t ... ${whereClause}`);
    console.log('   SQL Params:', params);

    const [templates] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        t.*,
        s.name as school_name,
        COUNT(tc.id) as criteria_count,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM templates t
      LEFT JOIN schools s ON t.school_id = s.id
      LEFT JOIN template_criteria tc ON t.id = tc.template_id AND tc.is_active = TRUE
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.is_global DESC, t.created_at DESC
    `, params);

    console.log('   Query Results:', templates.length, 'templates found');
    templates.forEach((template: any) => {
      console.log(`   - "${template.template_name}" (school_id: ${template.school_id}, school: ${template.school_name})`);
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template with criteria
router.get('/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = (req as any).user;

    // Get template details
    const [templateRows] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        t.*,
        s.name as school_name,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM templates t
      LEFT JOIN schools s ON t.school_id = s.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `, [templateId]);

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateRows[0];

    // Check access permissions - school managers can only access their own school's templates
    if (template.school_id !== user.schoolId && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get template criteria
    const [criteriaRows] = await pool.execute<RowDataPacket[]>(`
      SELECT tc.*
      FROM template_criteria tc
      WHERE tc.template_id = ? AND tc.is_active = TRUE
      ORDER BY tc.weight DESC, tc.criteria_name
    `, [templateId]);

    res.json({
      ...template,
      criteria: criteriaRows
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new template
router.post('/', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      template_name,
      description,
      category,
      grade_levels,
      subjects,
      is_global = false,
      school_id,
      criteria
    } = req.body;

    if (!template_name || !category) {
      return res.status(400).json({ 
        error: 'Template name and category are required' 
      });
    }

    // Only SuperAdmin can create global templates
    if (is_global && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only SuperAdmin can create global templates' });
    }

    // Determine target school
    const targetSchoolId = is_global ? null : (user.role === 'super_admin' ? school_id : user.schoolId);

    // Create template
    const [templateResult] = await pool.execute<ResultSetHeader>(`
      INSERT INTO templates (
        template_name, description, category, grade_levels, subjects,
        is_global, school_id, created_by, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
    `, [
      template_name,
      description,
      category,
      JSON.stringify(grade_levels || []),
      JSON.stringify(subjects || []),
      is_global,
      targetSchoolId,
      user.id
    ]);

    const templateId = templateResult.insertId;

    // Add criteria if provided
    if (criteria && Array.isArray(criteria)) {
      for (const criterion of criteria) {
        await pool.execute(`
          INSERT INTO template_criteria (
            template_id, criteria_name, criteria_description, weight, is_active
          ) VALUES (?, ?, ?, ?, TRUE)
        `, [
          templateId,
          criterion.criteria_name,
          criterion.criteria_description,
          criterion.weight || 1.0
        ]);
      }
    }

    res.status(201).json({
      id: templateId,
      template_name,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:templateId', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = (req as any).user;
    const updates = req.body;

    // Check template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT school_id, is_global, created_by FROM templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateRows[0];

    // Check permissions - school managers can only modify their own school's templates
    if (user.role !== 'super_admin' && template.school_id !== user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'template_name', 'description', 'category', 'grade_levels', 
      'subjects', 'is_active', 'school_id'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'grade_levels' || field === 'subjects') {
          updateFields.push(`${field} = ?`);
          values.push(JSON.stringify(updates[field]));
        } else {
          updateFields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }
    }

    if (updateFields.length > 0) {
      values.push(templateId);
      await pool.execute(
        `UPDATE templates SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    // Handle criteria updates
    if (updates.criteria !== undefined && Array.isArray(updates.criteria)) {
      // First, deactivate all existing criteria
      await pool.execute(
        'UPDATE template_criteria SET is_active = FALSE WHERE template_id = ?',
        [templateId]
      );

      // Add new criteria
      for (const criterion of updates.criteria) {
        await pool.execute(`
          INSERT INTO template_criteria (
            template_id, criteria_name, criteria_description, weight, is_active
          ) VALUES (?, ?, ?, ?, TRUE)
        `, [
          templateId,
          criterion.criteria_name,
          criterion.criteria_description,
          criterion.weight || 1.0
        ]);
      }
    }

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:templateId', authorize('school_manager', 'super_admin'), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const user = (req as any).user;

    // Check template exists and user has permission
    const [templateRows] = await pool.execute<RowDataPacket[]>(
      'SELECT school_id, is_global, template_name FROM templates WHERE id = ?',
      [templateId]
    );

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateRows[0];

    // Check permissions - school managers can only delete their own school's templates
    if (user.role !== 'super_admin' && template.school_id !== user.schoolId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if template is in use (prevent deletion of active templates)
    const [usageRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as usage_count FROM audio_jobs WHERE template_id = ? AND status != "failed"',
      [templateId]
    );

    if (usageRows[0].usage_count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete template that is currently in use by audio jobs' 
      });
    }

    // Soft delete - set is_active = false
    await pool.execute(
      'UPDATE templates SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
      [templateId]
    );

    // Also deactivate associated criteria
    await pool.execute(
      'UPDATE template_criteria SET is_active = FALSE WHERE template_id = ?',
      [templateId]
    );

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get template categories for dropdown
router.get('/meta/categories', async (req: Request, res: Response) => {
  try {
    const [categories] = await pool.execute<RowDataPacket[]>(`
      SELECT DISTINCT category, COUNT(*) as template_count
      FROM templates 
      WHERE is_active = TRUE
      GROUP BY category
      ORDER BY template_count DESC, category ASC
    `);

    const defaultCategories = [
      'General Teaching',
      'Subject-Specific',
      'Assessment',
      'Classroom Management',
      'Student Engagement',
      'Professional Development',
      'Other'
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
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});


export default router;