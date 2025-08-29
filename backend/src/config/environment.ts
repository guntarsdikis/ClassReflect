/**
 * Environment Configuration for ClassReflect
 * Simplified configuration without S3 storage
 */

export type Environment = 'local' | 'production';

export interface EnvironmentConfig {
  env: Environment;
  processing: {
    type: 'assemblyai';
    assemblyaiApiKey?: string;
  };
  database: {
    host: string;
    user: string;
    password: string;
    database: string;
  };
}

/**
 * Detect current environment based on NODE_ENV and configuration
 */
export function detectEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  
  // If we have production database host, assume production
  if (process.env.DATABASE_HOST && process.env.DATABASE_HOST !== 'localhost') {
    return 'production';
  }
  
  // If explicitly set to production
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  // Default to local for development
  return 'local';
}

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = detectEnvironment();
  
  if (env === 'production') {
    return {
      env: 'production',
      processing: {
        type: 'assemblyai',
        assemblyaiApiKey: process.env.ASSEMBLYAI_API_KEY
      },
      database: {
        host: process.env.DATABASE_HOST || 'gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com',
        user: process.env.DATABASE_USER || 'gdwd',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'classreflect'
      }
    };
  } else {
    return {
      env: 'local',
      processing: {
        type: 'assemblyai',
        assemblyaiApiKey: process.env.ASSEMBLYAI_API_KEY
      },
      database: {
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'classreflect'
      }
    };
  }
}

export const config = getEnvironmentConfig();

console.log(`🌍 Environment: ${config.env}`);
console.log(`⚙️ Processing: ${config.processing.type}`);