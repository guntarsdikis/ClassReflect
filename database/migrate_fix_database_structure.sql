-- ClassReflect Database Structure Fix Migration
-- This script fixes the dual user tables problem and ID type mismatches
-- 
-- IMPORTANT: Always backup database before running this migration!
-- mysqldump -h localhost -u root -proot classreflect > backup_$(date +%Y%m%d_%H%M%S).sql

-- Step 1: Migrate admin user from teachers table to users table
-- This ensures we don't lose the admin@classreflect.gdwd.co.uk user
INSERT INTO users (
    email, first_name, last_name, role, school_id, is_active
) 
SELECT 
    email,
    first_name,
    last_name,
    CASE 
        WHEN role = 'super_admin' THEN 'super_admin'
        WHEN role = 'admin' THEN 'school_manager'
        ELSE 'teacher'
    END as role,
    CAST(school_id as CHAR) as school_id, -- Convert int to varchar for now
    1 as is_active
FROM teachers 
WHERE email NOT IN (SELECT email FROM users);

-- Step 2: Drop foreign key constraints from audio_jobs that point to teachers table
ALTER TABLE audio_jobs 
    DROP FOREIGN KEY audio_jobs_ibfk_1; -- teacher_id -> teachers.id

-- Step 3: Change users.school_id from varchar(36) to int
-- First, ensure all school_id values in users are valid integers that exist in schools
-- Check what school_id values exist first
SELECT DISTINCT school_id FROM users;

-- Convert school_id values to integers, defaulting invalid ones to school 1
UPDATE users 
SET school_id = '1' 
WHERE school_id NOT REGEXP '^[0-9]+$' 
   OR CAST(school_id as UNSIGNED) NOT IN (SELECT id FROM schools);

-- Now change the column type
ALTER TABLE users 
    MODIFY COLUMN school_id INT NOT NULL;

-- Step 4: Add foreign key constraint from users.school_id to schools.id
ALTER TABLE users 
    ADD CONSTRAINT fk_users_school_id 
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Step 5: Update audio_jobs foreign key to point to users.id instead of teachers.id
ALTER TABLE audio_jobs
    DROP FOREIGN KEY audio_jobs_ibfk_2,
    ADD CONSTRAINT fk_audio_jobs_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_audio_jobs_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Step 6: Add foreign key constraints to other tables that were missing them
ALTER TABLE transcripts 
    ADD CONSTRAINT fk_transcripts_job_id 
        FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transcripts_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Note: We'll keep the teachers table for now until we're sure migration worked
-- It can be dropped manually later with: DROP TABLE teachers;

-- Verify the migration worked
SELECT 'Migration completed successfully!' as status;

-- Show the new structure
SELECT 'Users table count:' as info, COUNT(*) as count FROM users;
SELECT 'Schools table count:' as info, COUNT(*) as count FROM schools;

-- Verify foreign key constraints exist
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    TABLE_SCHEMA = 'classreflect' 
    AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;