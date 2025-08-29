const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config();

async function createTables() {
  // Using the RDS database credentials
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com',
    user: process.env.DB_USER || 'gdwd',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'classreflect',
    multipleStatements: true
  });

  try {
    console.log('✅ Connected to database');
    
    // Read the schema file
    const schema = await fs.readFile('/Users/guntarsdikis/websites/ClassReflect/database/schema-cognito.sql', 'utf8');
    
    // Remove comments and split by semicolons
    const cleanSchema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty lines
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        // Extract first few words for logging
        const firstWords = statement.substring(0, 50).replace(/\n/g, ' ');
        console.log(`Executing: ${firstWords}...`);
        
        await connection.execute(statement);
      } catch (err) {
        // Some errors are expected (like duplicate key on INSERT)
        if (err.code === 'ER_DUP_ENTRY') {
          console.log('  ⚠️  Duplicate entry (skipping)');
        } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('  ⚠️  Table already exists (skipping)');
        } else {
          console.error(`  ❌ Error: ${err.message}`);
        }
      }
    }
    
    // Check if users table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
      console.log('\n✅ Users table exists!');
      
      // Count records
      const [count] = await connection.execute("SELECT COUNT(*) as count FROM users");
      console.log(`📊 Users table has ${count[0].count} records`);
    }
    
    console.log('\n🎉 Database setup complete!');
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await connection.end();
  }
}

createTables();