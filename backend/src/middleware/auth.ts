import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'mysql2/promise';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'teacher' | 'school_manager' | 'super_admin';
        schoolId: string;
      };
    }
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        schoolId: decoded.schoolId,
      };
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
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
  
  if (resourceSchoolId && resourceSchoolId !== req.user.schoolId) {
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
    
    if (teacherId && teacherId !== req.user.id) {
      res.status(403).json({ error: 'Teachers can only access their own data' });
      return;
    }
  }
  
  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
  });
};

/**
 * Verify user credentials (mock implementation - replace with real auth)
 */
export const verifyCredentials = async (
  email: string,
  password: string,
  pool: Pool
): Promise<TokenPayload | null> => {
  try {
    // This is a mock implementation
    // In production, you should:
    // 1. Query the database for the user
    // 2. Verify password with bcrypt
    // 3. Return user data
    
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.role, u.school_id, u.first_name, u.last_name, 
              s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = ? AND u.is_active = true`,
      [email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }
    
    const user = rows[0] as any;
    
    // TODO: Verify password with bcrypt
    // const validPassword = await bcrypt.compare(password, user.password_hash);
    // if (!validPassword) return null;
    
    // For now, accept any password in development
    if (process.env.NODE_ENV === 'development') {
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.school_id,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
};