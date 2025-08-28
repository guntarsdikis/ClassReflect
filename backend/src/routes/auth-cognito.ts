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
    
    // Check if password challenge is required
    if (authResult.challengeRequired) {
      console.log('Password challenge required for user:', email);
      res.json({
        challengeRequired: true,
        challengeName: authResult.challengeName,
        session: authResult.session,
        username: authResult.user.username,
        email: authResult.user.email
      });
      return;
    }
    
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
    
    
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /api/auth/complete-challenge
 * Complete NEW_PASSWORD_REQUIRED challenge
 */
router.post('/complete-challenge', async (req: Request, res: Response) => {
  try {
    const { username, newPassword, temporaryPassword } = req.body;
    
    if (!username || !newPassword || !temporaryPassword) {
      res.status(400).json({ error: 'Username, new password, and temporary password are required' });
      return;
    }
    
    if (newPassword.length < 12) {
      res.status(400).json({ error: 'Password must be at least 12 characters' });
      return;
    }
    
    console.log('Completing password challenge for user:', username);
    
    // Re-authenticate with temporary password to get fresh session
    let authResult;
    try {
      authResult = await cognitoService.authenticateUser(username.includes('@') ? username : `${username}@test.local`, temporaryPassword);
    } catch (error: any) {
      if (error.message && error.message.includes('Authentication challenge required')) {
        // This is expected - we should get the challenge again
        authResult = await cognitoService.authenticateUser(username.includes('@') ? username : `${username}@test.local`, temporaryPassword);
      } else {
        throw error;
      }
    }
    
    if (!authResult.challengeRequired || !authResult.session) {
      res.status(400).json({ error: 'Unable to get fresh challenge session' });
      return;
    }
    
    // Complete the challenge using the fresh session
    const challengeResult = await cognitoService.completeNewPasswordChallenge(username, newPassword, authResult.session);
    
    if (!challengeResult.success) {
      res.status(400).json({ error: 'Failed to complete password challenge' });
      return;
    }
    
    // Get user details from Cognito
    const cognitoUser = await cognitoService.getUser(username);
    
    // Sync user with local database
    await syncUserWithDatabase(cognitoUser);
    
    // Get full user details from database
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
              u.school_id, s.name as school_name, u.subjects, u.grades
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = ? AND u.is_active = true`,
      [cognitoUser.email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      // Return Cognito data if not in database yet
      res.json({
        accessToken: challengeResult.tokens.accessToken,
        idToken: challengeResult.tokens.idToken,
        refreshToken: challengeResult.tokens.refreshToken,
        user: {
          id: 0,
          email: cognitoUser.email,
          firstName: cognitoUser.firstName,
          lastName: cognitoUser.lastName,
          role: cognitoUser.role,
          schoolId: cognitoUser.schoolId,
          schoolName: 'Test School',
          subjects: cognitoUser.subjects || [],
          grades: cognitoUser.grades || [],
          cognitoUsername: cognitoUser.username
        }
      });
      return;
    }
    
    const user = rows[0] as any;
    
    res.json({
      accessToken: challengeResult.tokens.accessToken,
      idToken: challengeResult.tokens.idToken,
      refreshToken: challengeResult.tokens.refreshToken,
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
        cognitoUsername: cognitoUser.username
      }
    });
  } catch (error: any) {
    console.error('Complete challenge error:', error);
    res.status(500).json({ error: 'Failed to complete password challenge' });
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
      subjects: parseArrayField(user.subjects),
      grades: parseArrayField(user.grades),
      createdAt: user.created_at,
      lastLogin: user.last_login,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update current user profile (authenticated)
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      res.status(400).json({ error: 'First name, last name, and email are required' });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    
    // Check if email is already taken by another user
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ? AND is_active = true',
      [email, req.user!.id]
    );
    
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      res.status(400).json({ error: 'Email is already in use by another user' });
      return;
    }
    
    // Update user in database
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [firstName, lastName, email, req.user!.id]
    );
    
    // Update Cognito user (only in production, skip in development)
    if (process.env.NODE_ENV !== 'development') {
      try {
        // Get current user details for Cognito update
        const [userRows] = await pool.execute(
          'SELECT cognito_username FROM users WHERE id = ?',
          [req.user!.id]
        );
        
        if (Array.isArray(userRows) && userRows.length > 0) {
          const user = userRows[0] as any;
          
          // Update Cognito user attributes
          await cognitoService.updateUser(user.cognito_username || email, {
            firstName,
            lastName,
            email
          });
        }
      } catch (cognitoError) {
        console.error('Failed to update Cognito user:', cognitoError);
        // Don't fail the whole request if Cognito update fails
        // The database update already succeeded
      }
    } else {
      console.log('Development mode: Skipping Cognito profile update for', email);
    }
    
    // Get updated user data to return
    const [updatedRows] = await pool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role,
              u.school_id, s.name as school_name, u.subjects, u.grades,
              u.created_at, u.last_login
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = ? AND u.is_active = true`,
      [req.user!.id]
    );
    
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      res.status(500).json({ error: 'Failed to retrieve updated profile' });
      return;
    }
    
    const updatedUser = updatedRows[0] as any;
    
    console.log('Profile updated:', { 
      userId: req.user!.id, 
      email, 
      firstName, 
      lastName 
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        schoolId: updatedUser.school_id,
        schoolName: updatedUser.school_name,
        subjects: parseArrayField(updatedUser.subjects),
        grades: parseArrayField(updatedUser.grades),
        createdAt: updatedUser.created_at,
        lastLogin: updatedUser.last_login,
      }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Map Cognito school IDs to database school IDs
 */
function mapSchoolId(cognitoSchoolId: string): number {
  // For demo purposes, all users belong to the Demo Elementary School (ID: 1)
  const schoolMapping: Record<string, number> = {
    'test-school-001': 1, // Demo Elementary School
    'test-school-002': 1, // Demo Elementary School (fallback)
    'platform': 1        // Demo Elementary School (platform users)
  };
  
  return schoolMapping[cognitoSchoolId] || 1; // Default to school 1 if not found
}

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
      // Update existing user (preserve database role, don't overwrite with Cognito role)
      const user = existing[0] as any;
      
      await pool.execute(
        `UPDATE users SET 
         first_name = ?, last_name = ?, 
         subjects = ?, grades = ?, cognito_username = ?, last_login = NOW(),
         updated_at = NOW()
         WHERE id = ?`,
        [
          cognitoUser.firstName,
          cognitoUser.lastName,
          cognitoUser.subjects ? JSON.stringify(cognitoUser.subjects) : null,
          cognitoUser.grades ? JSON.stringify(cognitoUser.grades) : null,
          cognitoUser.username,
          user.id
        ]
      );
      
      console.log(`✅ User sync: Preserved existing role for ${cognitoUser.email} (database is source of truth for roles)`);
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