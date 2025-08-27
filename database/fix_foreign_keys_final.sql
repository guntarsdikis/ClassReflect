-- Fix Foreign Key Constraints to Reference Users Table
-- This script removes all references to the old teachers table and points them to users table

USE classreflect;

-- Drop foreign key constraints that reference teachers table
ALTER TABLE audio_jobs DROP FOREIGN KEY audio_jobs_ibfk_1;
ALTER TABLE analysis_results DROP FOREIGN KEY analysis_results_ibfk_3;
ALTER TABLE teacher_progress DROP FOREIGN KEY teacher_progress_ibfk_1;
ALTER TABLE transcripts DROP FOREIGN KEY transcripts_ibfk_2;

-- Add new foreign key constraints referencing users table
ALTER TABLE audio_jobs 
ADD CONSTRAINT audio_jobs_teacher_fk 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE analysis_results 
ADD CONSTRAINT analysis_results_teacher_fk 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE teacher_progress 
ADD CONSTRAINT teacher_progress_teacher_fk 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE transcripts 
ADD CONSTRAINT transcripts_teacher_fk 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old teachers table (it should be empty after migration)
DROP TABLE IF EXISTS teachers;

SELECT 'Foreign key constraints updated successfully' as status;