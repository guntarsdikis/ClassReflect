import { Router, Request, Response } from 'express';
import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

const router = Router();

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Get all teachers for a school
router.get('/school/:schoolId', async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, email, department, school_id, is_active, created_at 
       FROM teachers 
       WHERE school_id = ? AND is_active = TRUE 
       ORDER BY name`,
      [schoolId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Get single teacher
router.get('/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        t.id, t.name, t.email, t.department, t.school_id, t.is_active, t.created_at,
        s.name as school_name
       FROM teachers t
       JOIN schools s ON t.school_id = s.id
       WHERE t.id = ?`,
      [teacherId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

// Create new teacher
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password, department, schoolId } = req.body;

    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, password, schoolId' 
      });
    }

    // Check if email already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM teachers WHERE email = ?`,
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = hashPassword(password);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO teachers (name, email, password_hash, department, school_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, department, schoolId]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      email,
      schoolId,
      message: 'Teacher created successfully'
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Simple login (in production, use JWT)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedPassword = hashPassword(password);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        t.id, t.name, t.email, t.department, t.school_id, t.is_active,
        s.name as school_name
       FROM teachers t
       JOIN schools s ON t.school_id = s.id
       WHERE t.email = ? AND t.password_hash = ? AND t.is_active = TRUE`,
      [email, hashedPassword]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const teacher = rows[0];

    // In production, generate and return JWT token here
    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        schoolId: teacher.school_id,
        schoolName: teacher.school_name
      },
      // token: generateJWT(teacher) // TODO: Implement JWT
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get teacher's progress/statistics
router.get('/:teacherId/progress', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        tp.*,
        DATE_FORMAT(tp.analysis_date, '%Y-%m-%d') as date
      FROM teacher_progress tp
      WHERE tp.teacher_id = ?
    `;
    
    const params: any[] = [teacherId];

    if (startDate) {
      query += ' AND tp.analysis_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND tp.analysis_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY tp.analysis_date DESC LIMIT 30';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Also get summary statistics
    const [stats] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT aj.id) as total_recordings,
        AVG(ar.score) as avg_score,
        SUM(aj.duration_seconds) / 3600 as total_hours
      FROM audio_jobs aj
      LEFT JOIN analysis_results ar ON aj.id = ar.job_id
      WHERE aj.teacher_id = ? AND aj.status = 'completed'`,
      [teacherId]
    );

    res.json({
      progress: rows,
      summary: stats[0]
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch teacher progress' });
  }
});

// Update teacher
router.put('/:teacherId', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [];

    const allowedFields = ['name', 'email', 'department', 'is_active'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    // Handle password update separately
    if (updates.password) {
      updateFields.push('password_hash = ?');
      values.push(hashPassword(updates.password));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(teacherId);

    await pool.execute(
      `UPDATE teachers SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      teacherId,
      message: 'Teacher updated successfully'
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

export default router;