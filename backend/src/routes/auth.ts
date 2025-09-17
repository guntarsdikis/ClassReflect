import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Pool } from 'mysql2/promise';
import { generateToken, verifyCredentials, authenticate } from '../middleware/auth';
import { sendPasswordResetEmail } from '../services/email';

const router = Router();
let pool: Pool;

export const initializeAuthRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

/**
 * POST /api/auth/login
 * Login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 LOGIN ATTEMPT - Starting login process');
    console.log('🔐 LOGIN ATTEMPT - Email:', email);
    console.log('🔐 LOGIN ATTEMPT - Password provided:', password ? `YES (${password.length} chars)` : 'NO');
    console.log('🔐 LOGIN ATTEMPT - Request body keys:', Object.keys(req.body));
    console.log('🔐 LOGIN ATTEMPT - Request headers:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin']
    });
    
    if (!email || !password) {
      console.log('🔐 LOGIN ATTEMPT - FAILED: Missing email or password');
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    console.log('🔐 LOGIN ATTEMPT - Calling verifyCredentials...');
    
    // Verify credentials
    const userPayload = await verifyCredentials(email, password, pool);
    
    console.log('🔐 LOGIN ATTEMPT - verifyCredentials result:', userPayload ? 'SUCCESS' : 'FAILED');
    
    if (!userPayload) {
      console.log('🔐 LOGIN ATTEMPT - AUTHENTICATION FAILED for email:', email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    console.log('🔐 LOGIN ATTEMPT - Authentication successful, proceeding with user lookup');
    
    // Get full user details
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.school_id, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ?`,
      [userPayload.userId]
    );
    
    console.log('🔐 LOGIN ATTEMPT - User lookup query result:', {
      rowCount: Array.isArray(rows) ? rows.length : 'Not array',
      userId: userPayload.userId
    });
    
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('🔐 LOGIN ATTEMPT - FAILED: User not found in lookup phase for userId:', userPayload.userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = rows[0] as any;
    console.log('🔐 LOGIN ATTEMPT - User details retrieved:', {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      schoolId: user.school_id,
      schoolName: user.school_name
    });
    
    // Generate token
    const token = generateToken(userPayload);
    
    console.log('🔐 LOGIN ATTEMPT - Generated JWT token:', {
      userId: userPayload.userId,
      email: userPayload.email,
      role: userPayload.role,
      schoolId: userPayload.schoolId,
      tokenLength: token.length
    });
    
    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.school_name,
      },
    };
    
    console.log('🔐 LOGIN ATTEMPT - SUCCESS! Returning response:', {
      hasToken: !!responseData.token,
      userEmail: responseData.user.email,
      userRole: responseData.user.role
    });
    
    // Return user data and token
    res.json(responseData);
  } catch (error) {
    console.error('🔐 LOGIN ATTEMPT - CRITICAL ERROR:', error);
    console.error('🔐 LOGIN ATTEMPT - Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side
  // Here we just acknowledge the logout
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.school_id, s.name as school_name, u.created_at
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ?`,
      [req.user!.id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = rows[0] as any;
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      schoolId: user.school_id,
      schoolName: user.school_name,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user's profile (first name, last name, email)
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, email } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };

    // Basic validation
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: 'First name, last name, and email are required' });
      return;
    }

    // Email format validation (simple)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Check for existing email on a different user
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, userId]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Update user
    await pool.execute(
      'UPDATE users SET email = ?, first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?',
      [email, firstName, lastName, userId]
    );

    // Fetch updated profile
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.school_id, s.name as school_name, u.subjects, u.grades,
              u.is_active, u.created_at, u.last_login
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = rows[0] as any;

    // Safely parse JSON fields
    const parseArray = (data: any): string[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data !== 'string') return [];
      try { return JSON.parse(data); } catch { return data.split(',').map((x: string) => x.trim()).filter(Boolean); }
    };

    const userResponse = {
      id: updated.id,
      email: updated.email,
      firstName: updated.first_name,
      lastName: updated.last_name,
      role: updated.role,
      schoolId: updated.school_id,
      schoolName: updated.school_name,
      subjects: parseArray(updated.subjects),
      grades: parseArray(updated.grades),
      isActive: updated.is_active,
      createdAt: updated.created_at,
      lastLogin: updated.last_login || null,
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required' });
      return;
    }
    
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    
    // Verify current password
    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user!.id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = rows[0] as any;
    
    // In development, skip password verification
    if (process.env.NODE_ENV !== 'development') {
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        res.status(401).json({ error: 'Invalid current password' });
        return;
      }
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, req.user!.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    
    // Check if user exists
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name FROM users WHERE email = ? AND is_active = true LIMIT 1',
      [email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      // Don't reveal if email exists
      res.json({ message: 'If the email exists, a reset link will be sent' });
      return;
    }
    
    const userRow = rows[0] as any;
    const userId = userRow.id as number;
    const firstName = userRow.first_name as string | undefined;
    const lastName = userRow.last_name as string | undefined;

    // Generate secure token and store hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Invalidate existing tokens for this user
    await pool.execute(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = ?',
      [userId]
    );

    await pool.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, false)',
      [userId, hashedToken, expiresAt]
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'https://classreflect.gdwd.co.uk').replace(/\/$/, '');
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({
        recipient: email,
        resetLink,
        firstName,
        lastName,
      });
      console.log(`✉️ Password reset email enqueued for ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }
    
    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }
    
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [tokenRows] = await pool.execute(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token = ?
       LIMIT 1`,
      [hashedToken]
    );

    if (!Array.isArray(tokenRows) || tokenRows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const tokenRow = tokenRows[0] as any;

    if (tokenRow.used) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, tokenRow.user_id]
      );

      await connection.execute(
        'UPDATE password_reset_tokens SET used = true WHERE id = ?',
        [tokenRow.id]
      );

      // Invalidate any other outstanding tokens for this user
      await connection.execute(
        'UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false',
        [tokenRow.user_id]
      );

      await connection.commit();
    } catch (innerError) {
      await connection.rollback();
      throw innerError;
    } finally {
      connection.release();
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/create-initial-admin
 * Create initial super admin (only works if no users exist)
 */
router.post('/create-initial-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    
    // Check if any users exist
    const [existingUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const userCount = (existingUsers as any)[0].count;
    
    if (userCount > 0) {
      res.status(403).json({ error: 'Initial admin already exists' });
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create super admin
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
       VALUES (?, ?, ?, ?, 'super_admin', 'platform', true)`,
      [email, hashedPassword, firstName, lastName]
    );
    
    const userId = (result as any).insertId;
    
    res.json({
      message: 'Super admin created successfully',
      userId,
    });
  } catch (error) {
    console.error('Create initial admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

export default router;
