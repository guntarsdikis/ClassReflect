import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Pool } from 'mysql2/promise';

export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  schoolId: number;
  cognitoSub?: string;
  cognitoUsername?: string;
}

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// JWKS client for Cognito token verification
let jwksClientInstance: jwksClient.JwksClient;
let dbPool: Pool;

/**
 * Initialize the auth middleware with database pool
 */
export const initializeCognitoAuth = (pool: Pool) => {
  dbPool = pool;
  
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.AWS_REGION || 'eu-west-2';
  
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }
  
  // Initialize JWKS client for token verification
  jwksClientInstance = jwksClient({
    jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    requestHeaders: {},
    timeout: 30000,
  });
};

/**
 * Get signing key from Cognito JWKS
 */
function getKey(header: any, callback: any) {
  if (!jwksClientInstance) {
    return callback(new Error('JWKS client not initialized'));
  }
  
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify JWT token from Cognito
 */
function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Verify the token
    jwt.verify(token, getKey, {
      issuer: `https://cognito-idp.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      algorithms: ['RS256'],
      ignoreExpiration: false
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Authentication middleware for Cognito JWT tokens
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    // Get user from database using Cognito sub or email
    const cognitoUsername = decoded['cognito:username'] || decoded.username || decoded.sub || null;
    const email = decoded.email || null;
    
    if (!cognitoUsername && !email) {
      res.status(401).json({ error: 'Invalid token - missing user identifiers' });
      return;
    }
    
    const [rows] = await dbPool.execute(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id, u.cognito_username
       FROM users u
       WHERE (u.cognito_username = ? OR u.email = ?) AND u.is_active = true`,
      [cognitoUsername, email]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    const user = rows[0] as any;
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      schoolId: user.school_id,
      cognitoSub: decoded.sub,
      cognitoUsername: decoded['cognito:username'] || decoded.sub
    };
    
    // Update last login
    await dbPool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based authorization middleware
 */
export function authorize(...allowedRoles: ('teacher' | 'school_manager' | 'super_admin')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

/**
 * School isolation middleware - ensures users can only access their school's data
 */
export function requireSchoolAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  // Super admins can access all schools
  if (req.user.role === 'super_admin') {
    next();
    return;
  }
  
  // Check if request contains school-related parameters
  const schoolId = req.params.schoolId || req.query.schoolId || req.body.schoolId;
  
  if (schoolId && schoolId !== req.user.schoolId) {
    res.status(403).json({ error: 'Access denied - school restriction' });
    return;
  }
  
  // Attach user's school ID to request for database queries
  if (!req.body) req.body = {};
  req.body.currentSchoolId = req.user.schoolId;
  
  next();
}

/**
 * Teacher isolation middleware - ensures teachers can only access their own data
 */
export function requireTeacherAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  // School managers and super admins can access teacher data
  if (req.user.role === 'school_manager' || req.user.role === 'super_admin') {
    next();
    return;
  }
  
  // Teachers can only access their own data
  if (req.user.role === 'teacher') {
    const teacherId = req.params.teacherId || req.params.id || req.query.teacherId;
    
    if (teacherId && parseInt(teacherId as string) !== req.user.id) {
      res.status(403).json({ error: 'Access denied - can only access your own data' });
      return;
    }
    
    // Set teacher ID for database queries
    if (!req.body) req.body = {};
    req.body.currentTeacherId = req.user.id;
  }
  
  next();
}

/**
 * Admin-only middleware (School Manager or Super Admin)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  if (req.user.role !== 'school_manager' && req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

/**
 * Super admin only middleware
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  if (req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  
  next();
}