const mysql = require('mysql2/promise');
require('dotenv').config();

async function createUsersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com',
    user: process.env.DB_USER || 'gdwd',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'classreflect'
  });

  try {
    console.log('✅ Connected to database');
    
    // Create schools table first (users depends on it)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schools (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        contact_email VARCHAR(255),
        subscription_tier ENUM('basic', 'professional', 'enterprise') DEFAULT 'basic',
        subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
        subscription_expires DATE,
        max_teachers INT DEFAULT 10,
        max_monthly_uploads INT DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subscription_status (subscription_status),
        INDEX idx_domain (domain),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Schools table ready');
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('teacher', 'school_manager', 'super_admin') NOT NULL,
        school_id VARCHAR(36) NOT NULL,
        subjects JSON,
        grades JSON,
        cognito_username VARCHAR(255),
        password_hash VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_school_id (school_id),
        INDEX idx_cognito_username (cognito_username),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Users table created');
    
    // Insert test school
    await connection.execute(`
      INSERT IGNORE INTO schools (id, name, domain, contact_email) 
      VALUES (1, 'Test School', 'test.local', 'admin@test.local')
    `);
    console.log('✅ Test school created');
    
    // Check if table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
      console.log('✅ Verified: Users table exists!');
      
      const [columns] = await connection.execute("DESCRIBE users");
      console.log('\n📊 Users table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    }
    
    console.log('\n🎉 Database setup complete!');
    console.log('You can now login with testadmin@classreflect.local');
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await connection.end();
  }
}

createUsersTable();