import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'mysql2/promise';
import { authenticate, authorize, authorizeSchool } from '../middleware/auth';

const router = Router();
let pool: Pool;

export const initializeUsersRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

/**
 * GET /api/users/teachers
 * Get all teachers in the school (School Manager only)
 */
router.get('/teachers', 
  authenticate, 
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.role === 'super_admin' 
        ? req.query.schoolId 
        : req.user!.schoolId;
      
      const [rows] = await pool.execute(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.created_at,
                u.is_active, ut.subjects, ut.grades, 
                COUNT(DISTINCT j.id) as total_evaluations,
                AVG(j.score) as average_score
         FROM users u
         LEFT JOIN user_teachers ut ON u.id = ut.user_id
         LEFT JOIN jobs j ON u.id = j.teacher_id AND j.status = 'completed'
         WHERE u.role = 'teacher' AND u.school_id = ?
         GROUP BY u.id
         ORDER BY u.last_name, u.first_name`,
        [schoolId]
      );
      
      const teachers = (rows as any[]).map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        subjects: row.subjects ? JSON.parse(row.subjects) : [],
        grades: row.grades ? JSON.parse(row.grades) : [],
        totalEvaluations: row.total_evaluations,
        averageScore: row.average_score,
        isActive: row.is_active,
        createdAt: row.created_at,
      }));
      
      res.json(teachers);
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ error: 'Failed to get teachers' });
    }
  }
);

/**
 * POST /api/users/teachers
 * Create a new teacher account (School Manager only)
 */
router.post('/teachers',
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, subjects, grades } = req.body;
      
      if (!email || !firstName || !lastName) {
        res.status(400).json({ error: 'Email, first name, and last name are required' });
        return;
      }
      
      const schoolId = req.user!.role === 'super_admin' && req.body.schoolId
        ? req.body.schoolId
        : req.user!.schoolId;
      
      // Check if email already exists
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if ((existing as any[]).length > 0) {
        res.status(409).json({ error: 'Email already exists' });
        return;
      }
      
      // Generate temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Create user
        const [result] = await connection.execute(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
           VALUES (?, ?, ?, ?, 'teacher', ?, true)`,
          [email, hashedPassword, firstName, lastName, schoolId]
        );
        
        const userId = (result as any).insertId;
        
        // Add teacher-specific data
        await connection.execute(
          `INSERT INTO user_teachers (user_id, subjects, grades)
           VALUES (?, ?, ?)`,
          [userId, JSON.stringify(subjects || []), JSON.stringify(grades || [])]
        );
        
        await connection.commit();
        
        // TODO: Send email with temporary password
        
        res.status(201).json({
          id: userId,
          email,
          firstName,
          lastName,
          temporaryPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
          message: 'Teacher account created successfully',
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Create teacher error:', error);
      res.status(500).json({ error: 'Failed to create teacher' });
    }
  }
);

/**
 * POST /api/users/teachers/bulk
 * Bulk create teacher accounts (School Manager only)
 */
router.post('/teachers/bulk',
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { teachers } = req.body;
      
      if (!Array.isArray(teachers) || teachers.length === 0) {
        res.status(400).json({ error: 'Teachers array is required' });
        return;
      }
      
      const schoolId = req.user!.role === 'super_admin' && req.body.schoolId
        ? req.body.schoolId
        : req.user!.schoolId;
      
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const results = [];
      const errors = [];
      
      try {
        for (const teacher of teachers) {
          const { email, firstName, lastName, subjects, grades } = teacher;
          
          if (!email || !firstName || !lastName) {
            errors.push({ email, error: 'Missing required fields' });
            continue;
          }
          
          // Check if email exists
          const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
          );
          
          if ((existing as any[]).length > 0) {
            errors.push({ email, error: 'Email already exists' });
            continue;
          }
          
          // Generate temporary password
          const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`;
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          
          // Create user
          const [result] = await connection.execute(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
             VALUES (?, ?, ?, ?, 'teacher', ?, true)`,
            [email, hashedPassword, firstName, lastName, schoolId]
          );
          
          const userId = (result as any).insertId;
          
          // Add teacher-specific data
          await connection.execute(
            `INSERT INTO user_teachers (user_id, subjects, grades)
             VALUES (?, ?, ?)`,
            [userId, JSON.stringify(subjects || []), JSON.stringify(grades || [])]
          );
          
          results.push({
            id: userId,
            email,
            firstName,
            lastName,
            temporaryPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
          });
        }
        
        await connection.commit();
        
        res.json({
          success: results.length,
          failed: errors.length,
          results,
          errors,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Bulk create teachers error:', error);
      res.status(500).json({ error: 'Failed to create teachers' });
    }
  }
);

/**
 * PUT /api/users/teachers/:id
 * Update teacher information (School Manager only)
 */
router.put('/teachers/:id',
  authenticate,
  authorize('school_manager', 'super_admin'),
  authorizeSchool,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { subjects, grades, isActive } = req.body;
      
      // Verify teacher belongs to the school
      const [teacher] = await pool.execute(
        'SELECT school_id FROM users WHERE id = ? AND role = ?',
        [id, 'teacher']
      );
      
      if ((teacher as any[]).length === 0) {
        res.status(404).json({ error: 'Teacher not found' });
        return;
      }
      
      const teacherSchoolId = (teacher as any[])[0].school_id;
      
      if (req.user!.role !== 'super_admin' && teacherSchoolId !== req.user!.schoolId) {
        res.status(403).json({ error: 'Cannot update teacher from another school' });
        return;
      }
      
      // Update user status if provided
      if (typeof isActive === 'boolean') {
        await pool.execute(
          'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
          [isActive, id]
        );
      }
      
      // Update teacher-specific data
      if (subjects || grades) {
        await pool.execute(
          `UPDATE user_teachers 
           SET subjects = COALESCE(?, subjects), 
               grades = COALESCE(?, grades)
           WHERE user_id = ?`,
          [
            subjects ? JSON.stringify(subjects) : null,
            grades ? JSON.stringify(grades) : null,
            id
          ]
        );
      }
      
      res.json({ message: 'Teacher updated successfully' });
    } catch (error) {
      console.error('Update teacher error:', error);
      res.status(500).json({ error: 'Failed to update teacher' });
    }
  }
);

/**
 * DELETE /api/users/teachers/:id
 * Deactivate teacher account (School Manager only)
 */
router.delete('/teachers/:id',
  authenticate,
  authorize('school_manager', 'super_admin'),
  authorizeSchool,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify teacher belongs to the school
      const [teacher] = await pool.execute(
        'SELECT school_id FROM users WHERE id = ? AND role = ?',
        [id, 'teacher']
      );
      
      if ((teacher as any[]).length === 0) {
        res.status(404).json({ error: 'Teacher not found' });
        return;
      }
      
      const teacherSchoolId = (teacher as any[])[0].school_id;
      
      if (req.user!.role !== 'super_admin' && teacherSchoolId !== req.user!.schoolId) {
        res.status(403).json({ error: 'Cannot delete teacher from another school' });
        return;
      }
      
      // Soft delete (deactivate)
      await pool.execute(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      res.json({ message: 'Teacher deactivated successfully' });
    } catch (error) {
      console.error('Delete teacher error:', error);
      res.status(500).json({ error: 'Failed to delete teacher' });
    }
  }
);

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      let query = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.role,
               u.school_id, s.name as school_name, u.created_at
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        WHERE u.id = ?
      `;
      
      const [rows] = await pool.execute(query, [req.user!.id]);
      
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      const user = (rows as any[])[0];
      
      // Get additional data for teachers
      let additionalData = {};
      if (user.role === 'teacher') {
        const [teacherData] = await pool.execute(
          'SELECT subjects, grades FROM user_teachers WHERE user_id = ?',
          [user.id]
        );
        
        if ((teacherData as any[]).length > 0) {
          const data = (teacherData as any[])[0];
          additionalData = {
            subjects: data.subjects ? JSON.parse(data.subjects) : [],
            grades: data.grades ? JSON.parse(data.grades) : [],
          };
        }
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.school_name,
        createdAt: user.created_at,
        ...additionalData,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

export default router;