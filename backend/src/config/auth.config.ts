import { Pool } from 'mysql2/promise';

// JWT Auth configuration
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-development-secret-change-in-production',
    expiresIn: '24h'
  }
};

/**
 * Initialize JWT authentication system
 */
export function initializeAuth(pool: Pool) {
  console.log('🔐 Using JWT authentication');
  
  // Initialize JWT auth routes
  const { initializeAuthRoutes } = require('../routes/auth');
  const { initializeUsersRoutes } = require('../routes/users');
  
  initializeAuthRoutes(pool);
  initializeUsersRoutes(pool);
  
  return {
    authRoutes: require('../routes/auth').default,
    usersRoutes: require('../routes/users').default,
    authenticate: require('../middleware/auth').authenticate,
    authorize: require('../middleware/auth').authorize
  };
}