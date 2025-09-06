import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'mysql2/promise';

export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  schoolId: number | null; // null for super_admin users
}

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  schoolId: string;
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth Debug - Request URL:', req.method, req.url);
    console.log('🔐 Auth Debug - Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 Auth Debug - No valid Bearer token found');
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    console.log('🔐 Auth Debug - Token extracted, length:', token.length);
    console.log('🔐 Auth Debug - JWT_SECRET available:', !!JWT_SECRET);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      console.log('🔐 Auth Debug - Token decoded successfully:', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        schoolId: decoded.schoolId
      });
      
      console.log('🔐 Auth Debug - Raw decoded token schoolId:', {
        schoolIdString: decoded.schoolId,
        schoolIdType: typeof decoded.schoolId,
        parsedSchoolId: parseInt(decoded.schoolId),
        isNaN: isNaN(parseInt(decoded.schoolId))
      });

      // Handle schoolId - super_admin users have "platform" as schoolId, others have numeric IDs
      const schoolIdValue = decoded.role === 'super_admin' 
        ? null  // Super admin can access all schools, so no specific schoolId
        : parseInt(decoded.schoolId);
        
      req.user = {
        id: parseInt(decoded.userId),
        email: decoded.email,
        firstName: '', // JWT doesn't have these fields
        lastName: '',
        role: decoded.role,
        schoolId: schoolIdValue,
      };
      
      console.log('🔐 Auth Debug - User attached to request:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        schoolId: req.user.schoolId,
        schoolIdIsNull: req.user.schoolId === null
      });
      
      next();
    } catch (error) {
      console.log('🔐 Auth Debug - Token verification failed:', error);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('🔐 Auth Debug - Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Check if user has required role(s)
 */
export const authorize = (...roles: Array<'teacher' | 'school_manager' | 'super_admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};

/**
 * Check if user belongs to the same school (for school-level access control)
 */
export const authorizeSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  // Super admins can access any school
  if (req.user.role === 'super_admin') {
    next();
    return;
  }
  
  // Check if the resource belongs to the user's school
  const resourceSchoolId = req.params.schoolId || req.body.schoolId;
  
  if (resourceSchoolId && parseInt(resourceSchoolId) !== req.user.schoolId) {
    res.status(403).json({ error: 'Access denied to this school\'s resources' });
    return;
  }
  
  next();
};

/**
 * Check if teacher can only view their own data
 */
export const authorizeTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  // Teachers can only access their own data
  if (req.user.role === 'teacher') {
    const teacherId = req.params.teacherId || req.params.id;
    
    if (teacherId && parseInt(teacherId) !== req.user.id) {
      res.status(403).json({ error: 'Teachers can only access their own data' });
      return;
    }
  }
  
  next();
};

/**
 * Alias for authorizeSchool - for compatibility with Cognito routes
 */
export const requireSchoolAccess = authorizeSchool;

/**
 * Alias for authorizeTeacher - for compatibility with Cognito routes
 */
export const requireTeacherAccess = authorizeTeacher;

/**
 * Generate JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Verify user credentials with bcrypt password verification
 */
export const verifyCredentials = async (
  email: string,
  password: string,
  pool: Pool
): Promise<TokenPayload | null> => {
  try {
    console.log('🔐 Login Debug - Starting credential verification for email:', email);
    console.log('🔐 Login Debug - Password provided:', password ? `Yes (${password.length} chars)` : 'No');
    
    // Query the database for the user including password_hash
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.school_id, u.first_name, u.last_name, 
              u.password_hash, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = ? AND u.is_active = true`,
      [email]
    );
    
    console.log('🔐 Login Debug - Database query result:', {
      rowCount: Array.isArray(rows) ? rows.length : 'Not array',
      hasResults: Array.isArray(rows) && rows.length > 0
    });
    
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('🔐 Login Debug - No user found with email:', email);
      return null;
    }
    
    const user = rows[0] as any;
    console.log('🔐 Login Debug - User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.school_id,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash ? user.password_hash.length : 0,
      isActive: true // Query already filters for is_active = true
    });
    
    // Verify password with bcrypt if hash exists
    if (user.password_hash) {
      const bcrypt = require('bcrypt');
      console.log('🔐 Login Debug - Comparing password with bcrypt...');
      console.log('🔐 Login Debug - Input password:', password);
      console.log('🔐 Login Debug - Stored hash (first 20 chars):', user.password_hash.substring(0, 20) + '...');
      
      const validPassword = await bcrypt.compare(password, user.password_hash);
      console.log('🔐 Login Debug - Password comparison result:', validPassword);
      
      if (!validPassword) {
        console.log('🔐 Login Debug - Password verification failed for user:', email);
        return null;
      }
      
      console.log('🔐 Login Debug - Password verification successful!');
    } else {
      // If no password hash exists, reject login for security
      console.log(`⚠️ User ${email} has no password hash - rejecting login`);
      return null;
    }
    
    // Return user data for token generation
    const tokenPayload = {
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.school_id?.toString() || 'platform',
    };
    
    console.log('🔐 Login Debug - Returning token payload:', tokenPayload);
    return tokenPayload;
  } catch (error) {
    console.error('🔐 Login Debug - Error verifying credentials:', error);
    return null;
  }
};