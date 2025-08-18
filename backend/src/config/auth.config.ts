import { Pool } from 'mysql2/promise';

// Auth configuration - allows switching between JWT and Cognito
export const authConfig = {
  // Use Cognito if environment variables are set, otherwise fall back to JWT
  useCognito: !!(
    process.env.COGNITO_USER_POOL_ID && 
    process.env.COGNITO_CLIENT_ID && 
    process.env.COGNITO_CLIENT_SECRET
  ),
  
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    clientSecret: process.env.COGNITO_CLIENT_SECRET || '',
    region: process.env.AWS_REGION || 'eu-west-2'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-development-secret-change-in-production',
    expiresIn: '24h'
  }
};

/**
 * Initialize authentication middleware based on configuration
 */
export function initializeAuth(pool: Pool) {
  if (authConfig.useCognito) {
    console.log('🔐 Using AWS Cognito authentication');
    
    // Initialize Cognito auth
    const { initializeCognitoAuth } = require('../middleware/auth-cognito');
    initializeCognitoAuth(pool);
    
    // Initialize Cognito routes
    const { initializeCognitoAuthRoutes } = require('../routes/auth-cognito');
    const { initializeCognitoUserRoutes } = require('../routes/users-cognito');
    
    initializeCognitoAuthRoutes(pool);
    initializeCognitoUserRoutes(pool);
    
    return {
      authRoutes: require('../routes/auth-cognito').default,
      usersRoutes: require('../routes/users-cognito').default,
      authenticate: require('../middleware/auth-cognito').authenticate,
      authorize: require('../middleware/auth-cognito').authorize
    };
  } else {
    console.log('🔐 Using JWT authentication (fallback)');
    
    // Initialize JWT auth
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
}