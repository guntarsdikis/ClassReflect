/**
 * Environment Configuration for ClassReflect
 * Handles local development vs production environment detection and configuration
 */

export type Environment = 'local' | 'production';

export interface EnvironmentConfig {
  env: Environment;
  storage: {
    type: 's3' | 'local';
    s3Bucket?: string;
    localPath?: string;
  };
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
  
  // If we have AWS credentials and S3 bucket, assume production
  if (process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME) {
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
      storage: {
        type: 's3',
        s3Bucket: process.env.S3_BUCKET_NAME || 'classreflect-audio-files-573524060586'
      },
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
      storage: {
        type: 'local',
        localPath: process.env.LOCAL_AUDIO_PATH || '/tmp/classreflect-audio'
      },
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
console.log(`📁 Storage: ${config.storage.type}`);  
console.log(`⚙️ Processing: ${config.processing.type}`);