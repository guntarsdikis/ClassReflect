import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'mysql2/promise';
import { authenticate, authorize } from '../middleware/auth';

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
      console.log('🔍 Teachers Debug - req.user:', JSON.stringify(req.user, null, 2));
      console.log('🔍 Teachers Debug - req.query.schoolId:', req.query.schoolId);
      
      const schoolId = req.user!.role === 'super_admin' 
        ? req.query.schoolId 
        : req.user!.schoolId;
        
      console.log('🔍 Teachers Debug - Final schoolId for query:', schoolId);
      console.log('🔍 Teachers Debug - schoolId type:', typeof schoolId);
      
      const [rows] = await pool.execute(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.school_id, u.created_at,
                u.is_active, u.subjects, u.grades, 
                COUNT(DISTINCT aj.id) as total_evaluations
         FROM users u
         LEFT JOIN audio_jobs aj ON u.id = aj.teacher_id AND aj.status = 'completed'
         WHERE u.role = 'teacher' AND u.school_id = ?
         GROUP BY u.id
         ORDER BY u.last_name, u.first_name`,
        [schoolId]
      );
      
      console.log('🔍 Teachers Debug - Raw query results:', {
        rowCount: Array.isArray(rows) ? rows.length : 'Not array',
        rows: Array.isArray(rows) ? rows : 'Not array'
      });
      
      const teachers = (rows as any[]).map(row => {
        // Helper function to safely parse JSON or convert comma-separated string to array
        const parseSubjectsOrGrades = (data: any): string[] => {
          if (!data) return [];
          
          // If already an array, return it
          if (Array.isArray(data)) return data;
          
          // If not a string, return empty array
          if (typeof data !== 'string') return [];
          
          try {
            // Try to parse as JSON first
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            return data.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
        };

        return {
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: 'teacher', // Add role field for filtering
          schoolId: row.school_id, // Add missing schoolId field
          subjects: parseSubjectsOrGrades(row.subjects),
          grades: parseSubjectsOrGrades(row.grades),
          totalEvaluations: row.total_evaluations,
          averageScore: 0, // TODO: Calculate from analysis_results when implemented
          isActive: row.is_active,
          createdAt: row.created_at,
        };
      });
      
      console.log('🔍 Teachers Debug - Final response:', {
        teacherCount: teachers.length,
        teachers: teachers.map(t => ({ id: t.id, email: t.email, schoolId: schoolId }))
      });
      
      res.json(teachers);
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ error: 'Failed to get teachers' });
    }
  }
);

/**
 * POST /api/users
 * Create a new user with role selection (Super Admin only)
 */
router.post('/',
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, role, schoolId, subjects, grades, sendInviteEmail } = req.body;
      
      console.log('📤 Create User Debug - Request body:', req.body);
      
      if (!email || !firstName || !lastName || !role || !schoolId) {
        res.status(400).json({ error: 'Email, first name, last name, role, and school ID are required' });
        return;
      }
      
      if (!['teacher', 'school_manager'].includes(role)) {
        res.status(400).json({ error: 'Role must be either teacher or school_manager' });
        return;
      }
      
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
        // Create user with specified role
        const [result] = await connection.execute(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, true)`,
          [email, hashedPassword, firstName, lastName, role, schoolId]
        );
        
        const userId = (result as any).insertId;
        
        // Only add subjects and grades for teachers
        if (role === 'teacher' && (subjects || grades)) {
          await connection.execute(
            `UPDATE users SET subjects = ?, grades = ? WHERE id = ?`,
            [JSON.stringify(subjects || []), JSON.stringify(grades || []), userId]
          );
        }
        
        await connection.commit();
        
        // TODO: Send email with temporary password if sendInviteEmail is true
        
        console.log('✅ Create User Debug - User created successfully:', { userId, email, role });
        
        res.status(201).json({
          id: userId,
          email,
          firstName,
          lastName,
          role,
          schoolId,
          temporaryPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
          message: `${role === 'school_manager' ? 'School Manager' : 'Teacher'} account created successfully`,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

/**
 * GET /api/users
 * Get current user info OR all users (role-based access)
 * - Super admins: Get all users
 * - Other roles: Get current user info only
 */
router.get('/',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      if (user.role === 'super_admin') {
        // Super admin: return all users
        const [allUserRows] = await pool.execute(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.school_id, s.name as school_name, u.subjects, u.grades,
                  u.is_active, u.last_login, u.created_at
           FROM users u
           LEFT JOIN schools s ON u.school_id = s.id
           ORDER BY u.created_at DESC`
        );
        
        const parseSubjectsOrGrades = (data: any): string[] => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (typeof data !== 'string') return [];
          
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return data.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
        };

        const allUsers = (allUserRows as any[]).map(row => ({
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role,
          schoolId: row.school_id,
          schoolName: row.school_name,
          subjects: parseSubjectsOrGrades(row.subjects),
          grades: parseSubjectsOrGrades(row.grades),
          isActive: row.is_active,
          lastLogin: row.last_login,
          createdAt: row.created_at,
        }));
        
        res.json(allUsers);
      } else {
        // Other roles: return current user only
        const [userRows] = await pool.execute(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
                  u.school_id, s.name as school_name, u.subjects, u.grades,
                  u.is_active, u.created_at
           FROM users u
           LEFT JOIN schools s ON u.school_id = s.id
           WHERE u.id = ?`,
          [user.id]
        );
        
        if (!Array.isArray(userRows) || userRows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const currentUser = userRows[0] as any;
        
        const parseSubjectsOrGrades = (data: any): string[] => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (typeof data !== 'string') return [];
          
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return data.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
        };
        
        const response = {
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.first_name,
          lastName: currentUser.last_name,
          role: currentUser.role,
          schoolId: currentUser.school_id,
          schoolName: currentUser.school_name,
          subjects: parseSubjectsOrGrades(currentUser.subjects),
          grades: parseSubjectsOrGrades(currentUser.grades),
          isActive: currentUser.is_active,
          createdAt: currentUser.created_at,
        };
        
        res.json(response);
      }
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
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
        
        // Update teacher-specific data in users table
        await connection.execute(
          `UPDATE users SET subjects = ?, grades = ? WHERE id = ?`,
          [JSON.stringify(subjects || []), JSON.stringify(grades || []), userId]
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
          
          // Update teacher-specific data in users table
          await connection.execute(
            `UPDATE users SET subjects = ?, grades = ? WHERE id = ?`,
            [JSON.stringify(subjects || []), JSON.stringify(grades || []), userId]
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
      
      // Update teacher-specific data in users table
      if (subjects || grades) {
        const updateFields = [];
        const updateValues = [];
        
        if (subjects) {
          updateFields.push('subjects = ?');
          updateValues.push(JSON.stringify(subjects));
        }
        
        if (grades) {
          updateFields.push('grades = ?');
          updateValues.push(JSON.stringify(grades));
        }
        
        if (updateFields.length > 0) {
          updateValues.push(id);
          await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            updateValues
          );
        }
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
 * PATCH /api/users/:id/role
 * Update a user's role (Super Admin only)
 * - Allowed roles: teacher, school_manager
 * - If setting role to school_manager, schoolId is required
 */
router.patch('/:id/role',
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, schoolId } = req.body as { role?: string; schoolId?: number };

      const userId = parseInt(id, 10);
      if (isNaN(userId)) {
        res.status(400).json({ error: 'Invalid user ID' });
        return;
      }

      // Validate role
      if (!role || !['teacher', 'school_manager'].includes(role)) {
        res.status(400).json({ error: 'Role must be either teacher or school_manager' });
        return;
      }

      // Require schoolId when promoting to school_manager
      if (role === 'school_manager' && (!schoolId || isNaN(Number(schoolId)))) {
        res.status(400).json({ error: 'schoolId is required when assigning school_manager role' });
        return;
      }

      // Ensure user exists and is not a super_admin target (prevent demotion/escalation here)
      const [existingRows] = await pool.execute(
        'SELECT id, role, school_id FROM users WHERE id = ? LIMIT 1',
        [userId]
      );

      if (!Array.isArray(existingRows) || existingRows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const existing = existingRows[0] as any;
      if (existing.role === 'super_admin') {
        res.status(403).json({ error: 'Cannot change role for super_admin users' });
        return;
      }

      // Perform update
      const updates: string[] = ['role = ?'];
      const values: any[] = [role];
      
      if (role === 'school_manager') {
        updates.push('school_id = ?');
        values.push(parseInt(String(schoolId), 10));
      }

      values.push(userId);

      await pool.execute(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

/**
 * POST /api/users/teachers/:id/reset-password
 * Reset teacher password (School Manager and Super Admin only)
 */
router.post('/teachers/:id/reset-password',
  authenticate,
  authorize('school_manager', 'super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Verify teacher exists and belongs to the school
      const [teacher] = await pool.execute(
        'SELECT email, first_name, last_name, school_id FROM users WHERE id = ? AND role = ? AND is_active = true',
        [id, 'teacher']
      );
      
      if ((teacher as any[]).length === 0) {
        res.status(404).json({ error: 'Teacher not found or inactive' });
        return;
      }
      
      const teacherData = (teacher as any[])[0];
      
      // Check authorization - school managers can only reset teachers in their school
      if (req.user!.role !== 'super_admin' && teacherData.school_id !== req.user!.schoolId) {
        res.status(403).json({ error: 'Cannot reset password for teacher from another school' });
        return;
      }
      
      // Generate new temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update password in database
      await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      // TODO: Send email notification to teacher
      
      res.json({
        message: 'Teacher password reset successfully',
        temporaryPassword: tempPassword,
        teacherEmail: teacherData.email,
        teacherName: `${teacherData.first_name} ${teacherData.last_name}`,
        requiresPasswordChange: true
      });
      
    } catch (error) {
      console.error('Reset teacher password error:', error);
      res.status(500).json({ error: 'Failed to reset teacher password' });
    }
  }
);

/**
 * POST /api/users/:id/reset-password
 * Reset any user's password (Super Admin only)
 */
router.post('/:id/reset-password',
  authenticate,
  authorize('super_admin'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get user details
      const [user] = await pool.execute(
        'SELECT email, first_name, last_name, role FROM users WHERE id = ? AND is_active = true',
        [id]
      );
      
      if ((user as any[]).length === 0) {
        res.status(404).json({ error: 'User not found or inactive' });
        return;
      }
      
      const userData = (user as any[])[0];
      
      // Generate new temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update password in database
      await pool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, id]
      );
      
      // TODO: Send email notification to user
      
      res.json({
        message: 'User password reset successfully',
        temporaryPassword: tempPassword,
        userEmail: userData.email,
        userName: `${userData.first_name} ${userData.last_name}`,
        userRole: userData.role,
        requiresPasswordChange: true
      });
      
    } catch (error) {
      console.error('Reset user password error:', error);
      res.status(500).json({ error: 'Failed to reset user password' });
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
               u.school_id, s.name as school_name, u.subjects, u.grades, u.created_at
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        WHERE u.id = ?
      `;
      
      const [rows] = await pool.execute(query, [req.user!.id]);
      
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      const userRow = (rows as any[])[0];
      
      // Get additional data from users table (subjects and grades are already in main query)
      let additionalData = {};
      if (userRow.role === 'teacher') {
        // Helper function to safely parse JSON or convert comma-separated string to array
        const parseSubjectsOrGrades = (data: any): string[] => {
          if (!data) return [];
          
          // If already an array, return it
          if (Array.isArray(data)) return data;
          
          // If not a string, return empty array
          if (typeof data !== 'string') return [];
          
          try {
            // Try to parse as JSON first
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            // If JSON parsing fails, treat as comma-separated string
            return data.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
        };

        additionalData = {
          subjects: parseSubjectsOrGrades(userRow.subjects),
          grades: parseSubjectsOrGrades(userRow.grades),
        };
      }
      
      res.json({
        id: userRow.id,
        email: userRow.email,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        role: userRow.role,
        schoolId: userRow.school_id,
        schoolName: userRow.school_name,
        createdAt: userRow.created_at,
        ...additionalData,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
);

export default router;
