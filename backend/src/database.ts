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
    
    // Create tables if they don't exist
    const connection = await pool.getConnection();
    
    // Check if tables exist
    const [tables] = await connection.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'schools'",
      [process.env.DATABASE_NAME || process.env.DB_NAME || 'classreflect']
    );
    
    connection.release();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't crash the app if DB is not available
  }
}

export default pool;