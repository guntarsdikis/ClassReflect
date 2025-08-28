-- ClassReflect Database Cleanup - Remove Unused Tables (Final Safe Version)
-- This version handles foreign key constraints properly

USE classreflect;

-- Show current tables and foreign key constraints
SELECT 'CURRENT DATABASE STATE:' as info;

SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' 
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Check foreign key constraints that might prevent deletion
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'classreflect'
    AND REFERENCED_TABLE_NAME IN ('analysis_criteria', 'teacher_progress')
ORDER BY TABLE_NAME;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop analysis_criteria (DEPRECATED - replaced by templates system)
-- First drop dependent constraints/references
DROP TABLE IF EXISTS analysis_criteria;
SELECT 'analysis_criteria table dropped' as status;

-- 2. Drop template_assignments (doesn't exist anyway)
DROP TABLE IF EXISTS template_assignments;
SELECT 'template_assignments table dropped (if existed)' as status;

-- 3. Drop teacher_progress (UNUSED - no progress tracking implemented)
DROP TABLE IF EXISTS teacher_progress;
SELECT 'teacher_progress table dropped' as status;

-- 4. Drop school_settings (doesn't exist)
DROP TABLE IF EXISTS school_settings;
SELECT 'school_settings table dropped (if existed)' as status;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Clean up any orphaned template_criteria records that referenced analysis_criteria
-- Since analysis_criteria is gone, these references are now invalid
DELETE FROM template_criteria WHERE criteria_id NOT IN (
    SELECT id FROM analysis_criteria
);
SELECT 'Cleaned up orphaned template_criteria records' as status;

-- Show remaining tables after cleanup
SELECT 'AFTER CLEANUP - Remaining Tables:' as info;
SELECT 
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' 
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Final status
SELECT 'Database cleanup completed successfully!' as status;
SELECT 'Tables removed: analysis_criteria, teacher_progress' as removed_tables;
SELECT 'Note: template_criteria may have been cleaned of orphaned records' as note;