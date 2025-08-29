import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'mysql2/promise';
import { generateToken, verifyCredentials, authenticate } from '../middleware/auth';

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
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    // Verify credentials
    const userPayload = await verifyCredentials(email, password, pool);
    
    if (!userPayload) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Get full user details
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.school_id, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ?`,
      [userPayload.userId]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = rows[0] as any;
    
    // Generate token
    const token = generateToken(userPayload);
    
    console.log('🔐 Login Debug - Generated token for user:', {
      userId: userPayload.userId,
      email: userPayload.email,
      role: userPayload.role,
      schoolId: userPayload.schoolId
    });
    console.log('🔐 Login Debug - Token length:', token.length);
    
    // Return user data and token
    res.json({
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
    });
  } catch (error) {
    console.error('Login error:', error);
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
      'SELECT id FROM users WHERE email = ? AND is_active = true',
      [email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      // Don't reveal if email exists
      res.json({ message: 'If the email exists, a reset link will be sent' });
      return;
    }
    
    // TODO: Generate reset token and send email
    // For now, just acknowledge the request
    
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
    
    // TODO: Verify reset token and get user ID
    // For now, this is a placeholder
    
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