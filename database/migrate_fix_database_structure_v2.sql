-- ClassReflect Database Structure Fix Migration v2
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

-- Step 2: Drop ALL foreign key constraints that reference teachers table
ALTER TABLE audio_jobs DROP FOREIGN KEY audio_jobs_ibfk_1; -- teacher_id -> teachers.id

-- Drop other foreign keys that reference teachers (if they exist)
-- Check if these constraints exist first
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
     WHERE table_schema = DATABASE() AND table_name = 'transcripts' 
     AND constraint_name = 'transcripts_ibfk_2') > 0,
    'ALTER TABLE transcripts DROP FOREIGN KEY transcripts_ibfk_2',
    'SELECT "transcripts_ibfk_2 does not exist" as notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
     WHERE table_schema = DATABASE() AND table_name = 'analysis_results' 
     AND constraint_name = 'analysis_results_ibfk_3') > 0,
    'ALTER TABLE analysis_results DROP FOREIGN KEY analysis_results_ibfk_3',
    'SELECT "analysis_results_ibfk_3 does not exist" as notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
     WHERE table_schema = DATABASE() AND table_name = 'teacher_progress' 
     AND constraint_name = 'teacher_progress_ibfk_1') > 0,
    'ALTER TABLE teacher_progress DROP FOREIGN KEY teacher_progress_ibfk_1',
    'SELECT "teacher_progress_ibfk_1 does not exist" as notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Change users.school_id from varchar(36) to int
-- First, ensure all school_id values in users are valid integers that exist in schools
-- Check what school_id values exist first
SELECT 'Current school_id values in users:' as info;
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

-- Step 5: Update ALL tables to reference users instead of teachers
-- Fix audio_jobs
ALTER TABLE audio_jobs
    ADD CONSTRAINT fk_audio_jobs_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_audio_jobs_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Fix transcripts  
ALTER TABLE transcripts 
    ADD CONSTRAINT fk_transcripts_job_id 
        FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transcripts_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transcripts_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Fix analysis_results
ALTER TABLE analysis_results
    ADD CONSTRAINT fk_analysis_results_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix teacher_progress  
ALTER TABLE teacher_progress
    ADD CONSTRAINT fk_teacher_progress_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_teacher_progress_school_id 
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Step 6: Now we can safely drop the teachers table
-- (Comment this out for safety - can be run manually later)
-- DROP TABLE teachers;

-- Verify the migration worked
SELECT 'Migration completed successfully!' as status;

-- Show the new structure
SELECT 'Users table count:' as info, COUNT(*) as count FROM users;
SELECT 'Schools table count:' as info, COUNT(*) as count FROM schools;
SELECT 'Teachers table count (should be 1):' as info, COUNT(*) as count FROM teachers;

-- Show all current foreign key constraints
SELECT 'Foreign key constraints after migration:' as info;
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND REFERENCED_TABLE_NAME IS NOT NULL
    AND REFERENCED_TABLE_NAME IN ('users', 'schools', 'audio_jobs')
ORDER BY TABLE_NAME, COLUMN_NAME;