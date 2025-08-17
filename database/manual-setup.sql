-- Manual Database Setup for ClassReflect
-- Run this as admin user on Aurora MySQL

-- 1. Create database
CREATE DATABASE IF NOT EXISTS classreflect;

-- 2. Create application user (replace YOUR_SECURE_PASSWORD with a strong password)
CREATE USER IF NOT EXISTS 'classreflect_app'@'%' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON classreflect.* TO 'classreflect_app'@'%';
GRANT SELECT ON mysql.* TO 'classreflect_app'@'%';
FLUSH PRIVILEGES;

-- 4. Verify setup
SELECT User, Host FROM mysql.user WHERE User = 'classreflect_app';
SHOW DATABASES LIKE 'classreflect';

-- After running this, you need to:
-- 1. Update AWS Secrets Manager with the password you chose
-- 2. Run schema.sql as the classreflect_app user to create tables