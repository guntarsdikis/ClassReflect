import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { cognitoService, CognitoUser } from '../services/cognito';
import { 
  authenticate, 
  authorize, 
  requireSchoolAccess, 
  requireAdmin,
  requireSuperAdmin 
} from '../middleware/auth-cognito';

const router = Router();
let pool: Pool;

export const initializeCognitoUserRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

/**
 * POST /api/users/teachers
 * Create new teacher account (School Manager only)
 */
router.post('/teachers', 
  authenticate, 
  authorize('school_manager', 'super_admin'), 
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        firstName,
        lastName,
        subjects = [],
        grades = [],
        sendInviteEmail = true
      } = req.body;

      if (!email || !firstName || !lastName) {
        res.status(400).json({ error: 'Email, first name, and last name are required' });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Check if user already exists in database
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }

      // Generate temporary password
      const temporaryPassword = cognitoService.generateTemporaryPassword();

      // Create user data
      const userData: CognitoUser = {
        username: email,
        email: email,
        firstName: firstName,
        lastName: lastName,
        schoolId: String(req.user!.role === 'super_admin' ? req.body.schoolId : req.user!.schoolId),
        role: 'teacher',
        subjects: subjects.length > 0 ? subjects : undefined,
        grades: grades.length > 0 ? grades : undefined
      };

      // Create user in Cognito
      const cognitoResult = await cognitoService.createUser(userData, temporaryPassword);

      // Create user record in local database
      const [result] = await pool.execute(
        `INSERT INTO users (
          email, first_name, last_name, role, school_id, subjects, grades,
          cognito_username, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [
          email,
          firstName,
          lastName,
          'teacher',
          userData.schoolId,
          subjects.length > 0 ? JSON.stringify(subjects) : null,
          grades.length > 0 ? JSON.stringify(grades) : null,
          cognitoResult.username
        ]
      );

      const userId = (result as any).insertId;

      // Log the action for audit trail
      // TODO: Add audit logging when audit_log table is created
      console.log('User created:', { userId, email, firstName, lastName, role: 'teacher', createdBy: req.user!.id });
      /*
      await pool.execute(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, changes, created_at)
         VALUES (?, 'CREATE_USER', 'user', ?, ?, NOW())`,
        [
          req.user!.id,
          userId,
          JSON.stringify({ 
            email, 
            firstName, 
            lastName, 
            role: 'teacher',
            schoolId: userData.schoolId
          })
        ]
      );
      */

      res.status(201).json({
        message: 'Teacher account created successfully',
        teacherId: userId,
        email: email,
        temporaryPassword: sendInviteEmail ? undefined : temporaryPassword, // Only return if not emailing
        cognitoUsername: cognitoResult.username
      });
    } catch (error: any) {
      console.error('Create teacher error:', error);

      // Handle Cognito-specific errors
      if (error.name === 'UsernameExistsException') {
        res.status(400).json({ error: 'User with this email already exists in authentication system' });
        return;
      }

      if (error.name === 'InvalidParameterException') {
        res.status(400).json({ error: 'Invalid user data provided' });
        return;
      }

      res.status(500).json({ error: 'Failed to create teacher account' });
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
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      const { teachers } = req.body;

      if (!Array.isArray(teachers) || teachers.length === 0) {
        res.status(400).json({ error: 'Teachers array is required and cannot be empty' });
        return;
      }

      if (teachers.length > 50) {
        res.status(400).json({ error: 'Maximum 50 teachers can be created at once' });
        return;
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        
        try {
          const {
            email,
            firstName,
            lastName,
            subjects = [],
            grades = []
          } = teacher;

          if (!email || !firstName || !lastName) {
            errors.push({ 
              index: i, 
              email: email || 'unknown',
              error: 'Email, first name, and last name are required' 
            });
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push({ 
              index: i, 
              email: email,
              error: 'Invalid email format' 
            });
            continue;
          }

          // Check if user already exists
          const [existing] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
          );

          if (Array.isArray(existing) && existing.length > 0) {
            errors.push({ 
              index: i, 
              email: email,
              error: 'User already exists' 
            });
            continue;
          }

          // Generate temporary password
          const temporaryPassword = cognitoService.generateTemporaryPassword();

          // Create user data
          const userData: CognitoUser = {
            username: email,
            email: email,
            firstName: firstName,
            lastName: lastName,
            schoolId: String(req.user!.role === 'super_admin' ? req.body.schoolId : req.user!.schoolId),
            role: 'teacher',
            subjects: subjects.length > 0 ? subjects : undefined,
            grades: grades.length > 0 ? grades : undefined
          };

          // Create user in Cognito
          const cognitoResult = await cognitoService.createUser(userData, temporaryPassword);

          // Create user record in local database
          const [result] = await pool.execute(
            `INSERT INTO users (
              email, first_name, last_name, role, school_id, subjects, grades,
              cognito_username, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
            [
              email,
              firstName,
              lastName,
              'teacher',
              userData.schoolId,
              subjects.length > 0 ? JSON.stringify(subjects) : null,
              grades.length > 0 ? JSON.stringify(grades) : null,
              cognitoResult.username
            ]
          );

          const userId = (result as any).insertId;

          results.push({
            index: i,
            teacherId: userId,
            email: email,
            cognitoUsername: cognitoResult.username,
            success: true
          });

        } catch (error: any) {
          console.error(`Error creating teacher ${i}:`, error);
          errors.push({ 
            index: i, 
            email: teacher.email || 'unknown',
            error: error.message || 'Failed to create account' 
          });
        }
      }

      // TODO: Add audit logging when audit_log table is created
      console.log('Bulk users created:', { attempted: teachers.length, successful: results.length, failed: errors.length, createdBy: req.user!.id });

      res.json({
        message: `Bulk creation completed: ${results.length} successful, ${errors.length} failed`,
        successful: results.length,
        failed: errors.length,
        total: teachers.length,
        results: results,
        errors: errors
      });
    } catch (error) {
      console.error('Bulk create teachers error:', error);
      res.status(500).json({ error: 'Failed to process bulk teacher creation' });
    }
  }
);

/**
 * GET /api/users/teachers
 * Get all teachers in school (School Manager) or own profile (Teacher)
 */
router.get('/teachers',
  authenticate,
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      let query: string;
      let params: any[] = [];

      if (req.user!.role === 'super_admin') {
        // Super admin can see all teachers
        const schoolId = req.query.schoolId;
        if (schoolId) {
          query = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id,
                   s.name as school_name, u.subjects, u.grades, u.is_active, 
                   u.last_login, u.created_at
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.role = 'teacher' AND u.school_id = ?
            ORDER BY u.last_name, u.first_name
          `;
          params = [schoolId] as any[];
        } else {
          query = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id,
                   s.name as school_name, u.subjects, u.grades, u.is_active, 
                   u.last_login, u.created_at
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE u.role = 'teacher'
            ORDER BY s.name, u.last_name, u.first_name
          `;
          params = [] as any[];
        }
      } else if (req.user!.role === 'school_manager') {
        // School manager can see teachers in their school
        query = `
          SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id,
                 s.name as school_name, u.subjects, u.grades, u.is_active, 
                 u.last_login, u.created_at
          FROM users u
          LEFT JOIN schools s ON u.school_id = s.id
          WHERE u.role = 'teacher' AND u.school_id = ?
          ORDER BY u.last_name, u.first_name
        `;
        params = [req.user!.schoolId] as any[];
      } else {
        // Teachers can only see their own profile
        query = `
          SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id,
                 s.name as school_name, u.subjects, u.grades, u.is_active, 
                 u.last_login, u.created_at
          FROM users u
          LEFT JOIN schools s ON u.school_id = s.id
          WHERE u.id = ?
        `;
        params = [req.user!.id];
      }

      const [rows] = await pool.execute(query, params);
      
      if (!Array.isArray(rows)) {
        res.json([]);
        return;
      }

      // Helper function to safely parse JSON or comma-separated strings
      const parseJsonOrString = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            // Fallback: treat as comma-separated string
            return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          }
        }
        return [];
      };

      const teachers = rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        schoolId: row.school_id,
        schoolName: row.school_name,
        subjects: parseJsonOrString(row.subjects),
        grades: parseJsonOrString(row.grades),
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at
      }));

      res.json(teachers);
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ error: 'Failed to retrieve teachers' });
    }
  }
);

/**
 * PUT /api/users/teachers/:id
 * Update teacher (School Manager only)
 */
router.put('/teachers/:id',
  authenticate,
  authorize('school_manager', 'super_admin'),
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.params.id;
      const { subjects, grades, isActive } = req.body;

      // Get current teacher details
      const [teacherRows] = await pool.execute(
        'SELECT email, school_id FROM users WHERE id = ? AND role = ?',
        [teacherId, 'teacher']
      );

      if (!Array.isArray(teacherRows) || teacherRows.length === 0) {
        res.status(404).json({ error: 'Teacher not found' });
        return;
      }

      const teacher = teacherRows[0] as any;

      // Check school access (unless super admin)
      if (req.user!.role !== 'super_admin' && teacher.school_id !== req.user!.schoolId) {
        res.status(403).json({ error: 'Access denied - different school' });
        return;
      }

      // Prepare updates
      const updates: Partial<CognitoUser> = {};
      const dbUpdates: any[] = [];
      const dbFields: string[] = [];

      if (subjects !== undefined) {
        updates.subjects = subjects;
        dbUpdates.push(subjects.length > 0 ? JSON.stringify(subjects) : null);
        dbFields.push('subjects = ?');
      }

      if (grades !== undefined) {
        updates.grades = grades;
        dbUpdates.push(grades.length > 0 ? JSON.stringify(grades) : null);
        dbFields.push('grades = ?');
      }

      if (isActive !== undefined) {
        dbUpdates.push(isActive);
        dbFields.push('is_active = ?');
      }

      if (dbFields.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      // Update Cognito user (only if we have Cognito-relevant updates and not in development mode)
      if (process.env.NODE_ENV !== 'development' && (updates.subjects !== undefined || updates.grades !== undefined)) {
        await cognitoService.updateUser(teacher.email, updates);
      } else if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Skipping Cognito user update for', teacher.email, updates);
      }

      // Update local database
      dbUpdates.push(teacherId);
      await pool.execute(
        `UPDATE users SET ${dbFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        dbUpdates
      );

      // Handle Cognito user status (skip in development mode)
      if (isActive !== undefined && process.env.NODE_ENV !== 'development') {
        if (isActive) {
          await cognitoService.enableUser(teacher.email);
        } else {
          await cognitoService.disableUser(teacher.email);
        }
      } else if (isActive !== undefined && process.env.NODE_ENV === 'development') {
        console.log('Development mode: Skipping Cognito user status change for', teacher.email, { isActive });
      }

      // TODO: Add audit logging when audit_log table is created
      console.log('Teacher updated:', { teacherId, subjects, grades, isActive, updatedBy: req.user!.id });

      res.json({ message: 'Teacher updated successfully' });
    } catch (error: any) {
      console.error('Update teacher error:', error);
      res.status(500).json({ error: 'Failed to update teacher' });
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
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.params.id;

      // Get teacher details
      const [teacherRows] = await pool.execute(
        'SELECT email, school_id, cognito_username, first_name, last_name FROM users WHERE id = ? AND role = ?',
        [teacherId, 'teacher']
      );

      if (!Array.isArray(teacherRows) || teacherRows.length === 0) {
        res.status(404).json({ error: 'Teacher not found' });
        return;
      }

      const teacher = teacherRows[0] as any;

      // Check school access (unless super admin)
      if (req.user!.role !== 'super_admin' && teacher.school_id !== req.user!.schoolId) {
        res.status(403).json({ error: 'Access denied - different school' });
        return;
      }

      // Reset password in Cognito 
      let temporaryPassword = 'DevPass123!';
      
      try {
        if (process.env.NODE_ENV !== 'development') {
          // Production: Use Cognito password reset
          const resetResult = await cognitoService.resetUserPassword(teacher.cognito_username || teacher.email);
          temporaryPassword = resetResult.temporaryPassword;
        } else {
          // Development: Actually reset in Cognito too, but with a known password
          console.log('Development mode: Performing Cognito password reset for', teacher.email);
          const resetResult = await cognitoService.resetUserPassword(teacher.cognito_username || teacher.email);
          temporaryPassword = resetResult.temporaryPassword;
        }
      } catch (cognitoError) {
        console.error('Cognito password reset failed:', cognitoError);
        // In development, if Cognito fails, use a fake password for UI testing
        if (process.env.NODE_ENV === 'development') {
          temporaryPassword = `DevTemp${Math.random().toString(36).substring(7)}!`;
          console.log('Using fake password for development UI testing:', temporaryPassword);
        } else {
          throw cognitoError; // Re-throw in production
        }
      }

      // TODO: Add audit logging when audit_log table is created
      console.log('Password reset:', { teacherId, email: teacher.email, resetBy: req.user!.id });

      res.json({
        message: 'Password reset successfully',
        temporaryPassword: temporaryPassword,
        teacherEmail: teacher.email,
        teacherName: `${teacher.first_name} ${teacher.last_name}`,
        requiresPasswordChange: true
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

/**
 * DELETE /api/users/teachers/:id
 * Delete teacher (School Manager only)
 */
router.delete('/teachers/:id',
  authenticate,
  authorize('school_manager', 'super_admin'),
  requireSchoolAccess,
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.params.id;

      // Get teacher details
      const [teacherRows] = await pool.execute(
        'SELECT email, school_id FROM users WHERE id = ? AND role = ?',
        [teacherId, 'teacher']
      );

      if (!Array.isArray(teacherRows) || teacherRows.length === 0) {
        res.status(404).json({ error: 'Teacher not found' });
        return;
      }

      const teacher = teacherRows[0] as any;

      // Check school access (unless super admin)
      if (req.user!.role !== 'super_admin' && teacher.school_id !== req.user!.schoolId) {
        res.status(403).json({ error: 'Access denied - different school' });
        return;
      }

      // Check if teacher has associated data (recordings, etc.)
      const [jobRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM audio_jobs WHERE teacher_id = ?',
        [teacherId]
      );

      const jobCount = (jobRows as any)[0].count;

      if (jobCount > 0) {
        // Don't delete, just deactivate
        await pool.execute(
          'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?',
          [teacherId]
        );

        await cognitoService.disableUser(teacher.email);

        res.json({ 
          message: 'Teacher deactivated successfully (has associated recordings)',
          deactivated: true 
        });
      } else {
        // Safe to delete completely
        await pool.execute('DELETE FROM users WHERE id = ?', [teacherId]);
        await cognitoService.deleteUser(teacher.email);

        res.json({ 
          message: 'Teacher deleted successfully',
          deleted: true 
        });
      }

      // TODO: Add audit logging when audit_log table is created
      console.log('Teacher deleted/deactivated:', { teacherId, email: teacher.email, hasJobs: jobCount > 0, deletedBy: req.user!.id });

    } catch (error) {
      console.error('Delete teacher error:', error);
      res.status(500).json({ error: 'Failed to delete teacher' });
    }
  }
);

/**
 * POST /api/admin/schools
 * Create new school with initial manager (Super Admin only)
 */
router.post('/admin/schools',
  authenticate,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        schoolName,
        domain,
        subscriptionTier = 'basic',
        managerEmail,
        managerFirstName,
        managerLastName
      } = req.body;

      if (!schoolName || !managerEmail || !managerFirstName || !managerLastName) {
        res.status(400).json({ error: 'All school and manager fields are required' });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(managerEmail)) {
        res.status(400).json({ error: 'Invalid manager email format' });
        return;
      }

      // Check if school or manager already exists
      const [existingSchool] = await pool.execute(
        'SELECT id FROM schools WHERE name = ?',
        [schoolName]
      );

      const [existingUser] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [managerEmail]
      );

      if (Array.isArray(existingSchool) && existingSchool.length > 0) {
        res.status(400).json({ error: 'School with this name already exists' });
        return;
      }

      if (Array.isArray(existingUser) && existingUser.length > 0) {
        res.status(400).json({ error: 'User with manager email already exists' });
        return;
      }

      // Create school first
      const [schoolResult] = await pool.execute(
        `INSERT INTO schools (name, domain, subscription_tier, is_active, created_at, updated_at)
         VALUES (?, ?, ?, true, NOW(), NOW())`,
        [schoolName, domain, subscriptionTier]
      );

      const schoolId = (schoolResult as any).insertId;

      // Generate temporary password for manager
      const temporaryPassword = cognitoService.generateTemporaryPassword();

      // Create school manager in Cognito
      const managerData: CognitoUser = {
        username: managerEmail,
        email: managerEmail,
        firstName: managerFirstName,
        lastName: managerLastName,
        schoolId: schoolId.toString(),
        role: 'school_manager'
      };

      const cognitoResult = await cognitoService.createUser(managerData, temporaryPassword);

      // Create manager record in local database
      const [managerResult] = await pool.execute(
        `INSERT INTO users (
          email, first_name, last_name, role, school_id, cognito_username,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
        [
          managerEmail,
          managerFirstName,
          managerLastName,
          'school_manager',
          schoolId,
          cognitoResult.username
        ]
      );

      const managerId = (managerResult as any).insertId;

      // TODO: Add audit logging when audit_log table is created
      console.log('School with manager created:', { schoolId, schoolName, domain, subscriptionTier, managerEmail, managerId, createdBy: req.user!.id });

      res.status(201).json({
        message: 'School and manager created successfully',
        schoolId: schoolId,
        managerId: managerId,
        managerEmail: managerEmail,
        temporaryPassword: temporaryPassword,
        cognitoUsername: cognitoResult.username
      });
    } catch (error: any) {
      console.error('Create school error:', error);

      if (error.name === 'UsernameExistsException') {
        res.status(400).json({ error: 'Manager email already exists in authentication system' });
        return;
      }

      res.status(500).json({ error: 'Failed to create school' });
    }
  }
);

export default router;