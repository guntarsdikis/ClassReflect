import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { cognitoService, CognitoUser } from '../services/cognito';
import { authenticate } from '../middleware/auth-cognito';

const router = Router();
let pool: Pool;

export const initializeCognitoAuthRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

/**
 * Parse array field that might be JSON array, actual array, or comma-separated string
 */
function parseArrayField(value: string | string[] | null): string[] {
  if (!value) return [];
  
  // If it's already an array, return it
  if (Array.isArray(value)) return value;
  
  // If it's a string, try JSON parsing first
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // If JSON parsing fails, treat as comma-separated string
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user with Cognito and sync with local database
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Authenticate with Cognito
    const authResult = await cognitoService.authenticateUser(email, password);
    
    // Sync user with local database (or create if not exists)
    try {
      await syncUserWithDatabase(authResult.user);
    } catch (syncError: any) {
      console.error('Error syncing user with database:', syncError);
      // Continue anyway - user is authenticated with Cognito
    }
    
    // Get full user details including school info
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.school_id, s.name as school_name, u.subjects, u.grades
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = ? AND u.is_active = true`,
      [authResult.user.email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      // User authenticated with Cognito but not in database yet
      // Return data from Cognito
      res.json({
        accessToken: authResult.accessToken,
        idToken: authResult.idToken,
        refreshToken: authResult.refreshToken,
        user: {
          id: 0, // Temporary ID until database sync
          email: authResult.user.email,
          firstName: authResult.user.firstName || 'User',
          lastName: authResult.user.lastName || '',
          role: authResult.user.role || 'teacher',
          schoolId: authResult.user.schoolId || 'test-school-001',
          schoolName: 'Test School',
          subjects: authResult.user.subjects || [],
          grades: authResult.user.grades || [],
          cognitoUsername: authResult.user.username
        },
      });
      return;
    }
    
    const user = rows[0] as any;
    
    // Return tokens and user data
    res.json({
      accessToken: authResult.accessToken,
      idToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.school_name,
        subjects: parseArrayField(user.subjects),
        grades: parseArrayField(user.grades),
        cognitoUsername: authResult.user.username
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    if (error.name === 'UserNotConfirmedException') {
      res.status(401).json({ error: 'Account not verified. Please check your email.' });
      return;
    }
    
    if (error.name === 'PasswordResetRequiredException') {
      res.status(401).json({ error: 'Password reset required. Please use forgot password.' });
      return;
    }
    
    if (error.name === 'UserNotFoundException') {
      res.status(401).json({ error: 'User account not found' });
      return;
    }
    
    if (error.message.includes('Authentication challenge required')) {
      res.status(401).json({ error: 'Password change required. Please use temporary password flow.' });
      return;
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user (requires current Cognito session)
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }
    
    if (newPassword.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }
    
    // Set permanent password in Cognito
    await cognitoService.setPermanentPassword(req.user!.email, newPassword);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    
    if (error.name === 'InvalidPasswordException') {
      res.status(400).json({ error: 'Password does not meet requirements' });
      return;
    }
    
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/set-permanent-password
 * Set permanent password after logging in with temporary password
 */
router.post('/set-permanent-password', async (req: Request, res: Response) => {
  try {
    const { email, temporaryPassword, newPassword } = req.body;
    
    if (!email || !temporaryPassword || !newPassword) {
      res.status(400).json({ error: 'Email, temporary password, and new password are required' });
      return;
    }
    
    if (newPassword.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }
    
    // First authenticate with temporary password
    try {
      await cognitoService.authenticateUser(email, temporaryPassword);
    } catch (error: any) {
      if (error.message.includes('Authentication challenge required')) {
        // This is expected for temporary passwords
      } else {
        throw error;
      }
    }
    
    // Set permanent password
    await cognitoService.setPermanentPassword(email, newPassword);
    
    // Now authenticate with new password to get tokens
    const authResult = await cognitoService.authenticateUser(email, newPassword);
    
    // Sync user with database
    await syncUserWithDatabase(authResult.user);
    
    // Get full user details
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.school_id, s.name as school_name, u.subjects, u.grades
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = ? AND u.is_active = true`,
      [authResult.user.email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({ error: 'User not found in database' });
      return;
    }
    
    const user = rows[0] as any;
    
    res.json({
      message: 'Password set successfully',
      accessToken: authResult.accessToken,
      idToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.school_name,
        subjects: parseArrayField(user.subjects),
        grades: parseArrayField(user.grades),
        cognitoUsername: authResult.user.username
      },
    });
  } catch (error: any) {
    console.error('Set permanent password error:', error);
    res.status(500).json({ error: 'Failed to set permanent password' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client handles token cleanup, no server-side action needed)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  // In Cognito, logout is primarily handled client-side by clearing tokens
  // We could implement global sign out here if needed
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/profile
 * Get current user profile (authenticated)
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    // Get user from database (more complete info than Cognito)
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.school_id, s.name as school_name, u.subjects, u.grades,
              u.created_at, u.last_login
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ? AND u.is_active = true`,
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
      subjects: user.subjects ? JSON.parse(user.subjects) : [],
      grades: user.grades ? JSON.parse(user.grades) : [],
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Sync Cognito user with local database
 */
async function syncUserWithDatabase(cognitoUser: CognitoUser): Promise<void> {
  try {
    // Check if user exists in database
    const [existing] = await pool.execute(
      'SELECT id, cognito_username FROM users WHERE email = ?',
      [cognitoUser.email]
    );
    
    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing user
      const user = existing[0] as any;
      await pool.execute(
        `UPDATE users SET 
         first_name = ?, last_name = ?, role = ?, school_id = ?,
         subjects = ?, grades = ?, cognito_username = ?, last_login = NOW(),
         updated_at = NOW()
         WHERE id = ?`,
        [
          cognitoUser.firstName,
          cognitoUser.lastName,
          cognitoUser.role,
          cognitoUser.schoolId,
          cognitoUser.subjects ? JSON.stringify(cognitoUser.subjects) : null,
          cognitoUser.grades ? JSON.stringify(cognitoUser.grades) : null,
          cognitoUser.username,
          user.id
        ]
      );
    } else {
      // Create new user
      await pool.execute(
        `INSERT INTO users (
          email, first_name, last_name, role, school_id, subjects, grades,
          cognito_username, is_active, last_login, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW(), NOW())`,
        [
          cognitoUser.email,
          cognitoUser.firstName,
          cognitoUser.lastName,
          cognitoUser.role,
          cognitoUser.schoolId,
          cognitoUser.subjects ? JSON.stringify(cognitoUser.subjects) : null,
          cognitoUser.grades ? JSON.stringify(cognitoUser.grades) : null,
          cognitoUser.username
        ]
      );
    }
  } catch (error) {
    console.error('Error syncing user with database:', error);
    // Don't throw - allow authentication to continue even if DB sync fails
  }
}

export default router;