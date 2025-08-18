-- Add users table for authentication and role-based access control
-- Run this script to update the existing database schema

USE classreflect;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('teacher', 'school_manager', 'super_admin') NOT NULL,
  school_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_school_role (school_id, role),
  INDEX idx_active (is_active)
);

-- Create teacher-specific data table
CREATE TABLE IF NOT EXISTS user_teachers (
  user_id INT PRIMARY KEY,
  subjects JSON,
  grades JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
);

-- Create sessions table (optional, for session-based auth)
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_session (user_id),
  INDEX idx_expires (expires_at)
);

-- Add teacher_id column to jobs table if it doesn't exist
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS teacher_id INT,
ADD FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add uploaded_by column to jobs table to track who uploaded
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS uploaded_by INT,
ADD FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create audit log table for tracking important actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_action (user_id, action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

-- Insert initial super admin (only if no users exist)
-- Note: Change the password immediately after first login
INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
SELECT 'admin@classreflect.com', 
       '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
       'System',
       'Administrator',
       'super_admin',
       'platform',
       true
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Create some sample data for development (remove in production)
-- Sample school manager
INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
SELECT 'manager@lincolnschool.edu',
       '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
       'Michael',
       'Roberts',
       'school_manager',
       'school-1',
       true
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'manager@lincolnschool.edu');

-- Sample teachers
INSERT INTO users (email, password_hash, first_name, last_name, role, school_id, is_active)
SELECT 'sarah.johnson@lincolnschool.edu',
       '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
       'Sarah',
       'Johnson',
       'teacher',
       'school-1',
       true
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sarah.johnson@lincolnschool.edu');

-- Add teacher-specific data
INSERT INTO user_teachers (user_id, subjects, grades)
SELECT id, '["Math", "Science"]', '["3", "4"]'
FROM users
WHERE email = 'sarah.johnson@lincolnschool.edu'
AND NOT EXISTS (
  SELECT 1 FROM user_teachers ut 
  WHERE ut.user_id = (SELECT id FROM users WHERE email = 'sarah.johnson@lincolnschool.edu')
);

-- Grant appropriate permissions (adjust based on your MySQL setup)
-- GRANT SELECT, INSERT, UPDATE ON classreflect.users TO 'your_app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON classreflect.user_teachers TO 'your_app_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON classreflect.password_reset_tokens TO 'your_app_user'@'%';
-- GRANT SELECT, INSERT, DELETE ON classreflect.user_sessions TO 'your_app_user'@'%';
-- GRANT INSERT ON classreflect.audit_logs TO 'your_app_user'@'%';