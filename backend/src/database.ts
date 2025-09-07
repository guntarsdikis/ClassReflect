import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '3306'),
  user: process.env.DATABASE_USER || process.env.DB_USER || 'root',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DATABASE_NAME || process.env.DB_NAME || 'classreflect',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    await testConnection();
    
    // Run lightweight migrations to ensure required columns exist
    await runMigrations();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't crash the app if DB is not available
  }
}

async function runMigrations(): Promise<void> {
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME || 'classreflect';
  const conn = await pool.getConnection();
  try {
    // Helper to check column existence
    async function columnExists(table: string, column: string): Promise<boolean> {
      const [rows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
        [dbName, table, column]
      );
      const r = rows as any[];
      return (r[0]?.cnt || 0) > 0;
    }

    // 1) audio_jobs.s3_key
    if (!(await columnExists('audio_jobs', 's3_key'))) {
      console.log('🛠️  Adding column audio_jobs.s3_key');
      await conn.query(`ALTER TABLE audio_jobs ADD COLUMN s3_key VARCHAR(500) NULL AFTER file_url`);
    }

    // 2) audio_jobs.assemblyai_upload_url
    if (!(await columnExists('audio_jobs', 'assemblyai_upload_url'))) {
      console.log('🛠️  Adding column audio_jobs.assemblyai_upload_url');
      await conn.query(`ALTER TABLE audio_jobs ADD COLUMN assemblyai_upload_url VARCHAR(500) NULL`);
    }

    // 3) audio_jobs.assemblyai_transcript_id
    if (!(await columnExists('audio_jobs', 'assemblyai_transcript_id'))) {
      console.log('🛠️  Adding column audio_jobs.assemblyai_transcript_id');
      await conn.query(`ALTER TABLE audio_jobs ADD COLUMN assemblyai_transcript_id VARCHAR(100) NULL`);
    }

    // 4) Ensure audio_jobs.status ENUM includes 'uploading'
    const [statusRows] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.columns WHERE table_schema = ? AND table_name = 'audio_jobs' AND column_name = 'status'`,
      [dbName]
    );
    const statusRow = (statusRows as any[])[0];
    if (statusRow && typeof statusRow.COLUMN_TYPE === 'string') {
      const type = statusRow.COLUMN_TYPE as string; // e.g., "enum('pending','queued','processing','completed','failed')"
      if (!type.includes("'uploading'")) {
        console.log('🛠️  Altering audio_jobs.status ENUM to include "uploading"');
        await conn.query(
          `ALTER TABLE audio_jobs MODIFY COLUMN status ENUM('pending','uploading','queued','processing','completed','failed') DEFAULT 'pending'`
        );
      }
    }
  } finally {
    conn.release();
  }
}

export default pool;
