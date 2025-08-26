#!/bin/bash

# Setup local MySQL database for ClassReflect development
# This script initializes the local database with the proper schema

set -e

echo "🗄️ Setting up ClassReflect local database..."

# Database configuration
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="classreflect"
DB_USER="root"
DB_PASSWORD="root"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if MySQL is accessible
echo -n "Checking MySQL connection... "
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Cannot connect to MySQL${NC}"
    echo "Make sure MySQL is running on localhost:3306 with user 'root' and password 'root'"
    exit 1
fi

# Create database if it doesn't exist
echo -n "Creating database '$DB_NAME'... "
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
echo -e "${GREEN}✅ Done${NC}"

# Apply schema
echo -n "Applying database schema... "
if mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema-cognito.sql 2>/dev/null; then
    echo -e "${GREEN}✅ Schema applied${NC}"
else
    echo -e "${RED}❌ Failed to apply schema${NC}"
    echo "Check if database/schema-cognito.sql exists"
    exit 1
fi

# Insert test data for Cognito users
echo -n "Creating test users for Cognito sync... "
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF' 2>/dev/null
-- Insert test schools
INSERT IGNORE INTO schools (id, name) VALUES 
('test-school-001', 'Test Elementary School'),
('platform', 'ClassReflect Platform');

-- Insert test users that match Cognito users
INSERT INTO users (email, first_name, last_name, role, school_id, subjects, grades, cognito_username, is_active) VALUES
('superadmin@test.local', 'Super', 'Admin', 'super_admin', 'platform', NULL, NULL, 'superadmin-test', true),
('manager@test.local', 'School', 'Manager', 'school_manager', 'test-school-001', NULL, NULL, 'manager-test', true),
('teacher@test.local', 'Test', 'Teacher', 'teacher', 'test-school-001', '["Math", "Science"]', '["3", "4", "5"]', 'teacher-test', true),
('testadmin@classreflect.local', 'Test', 'Admin', 'super_admin', 'test-school-001', NULL, NULL, 'testadmin', true)
ON DUPLICATE KEY UPDATE 
    first_name = VALUES(first_name),
    last_name = VALUES(last_name),
    role = VALUES(role),
    school_id = VALUES(school_id),
    subjects = VALUES(subjects),
    grades = VALUES(grades),
    cognito_username = VALUES(cognito_username),
    is_active = VALUES(is_active);
EOF

echo -e "${GREEN}✅ Test users created${NC}"

# Test backend database connection
echo -n "Testing backend database connection... "
cd backend
if node -e "
const { initializeDatabase } = require('./src/database.ts');
initializeDatabase().then(() => {
    console.log('Backend connection successful');
    process.exit(0);
}).catch(err => {
    console.error('Backend connection failed:', err.message);
    process.exit(1);
});
" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend connection working${NC}"
else
    echo -e "${YELLOW}⚠️  Backend connection test failed (but database is ready)${NC}"
fi

cd ..

echo ""
echo "🎉 Local database setup complete!"
echo "=================================="
echo -e "${GREEN}Database:${NC} $DB_NAME"
echo -e "${GREEN}Host:${NC} $DB_HOST:$DB_PORT"
echo -e "${GREEN}Users created:${NC}"
echo "  - superadmin@test.local (super_admin)"
echo "  - manager@test.local (school_manager)"
echo "  - teacher@test.local (teacher)"
echo "  - testadmin@classreflect.local (super_admin)"
echo ""
echo "You can now:"
echo "1. Start the backend: cd backend && npm run dev"
echo "2. Test login with: node test-backend-login.js"
echo "3. Connect to database: mysql -h localhost -u root -p classreflect"