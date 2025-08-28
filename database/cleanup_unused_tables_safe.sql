-- ClassReflect Database Cleanup - Remove Unused Tables (Safe Version)
-- Run this script to remove tables that are no longer used after AssemblyAI implementation

-- Backup note: Always backup your database before running this script!
-- mysqldump -h [host] -u [user] -p classreflect > backup_$(date +%Y%m%d_%H%M%S).sql

USE classreflect;

-- Show current tables
SELECT 
    'BEFORE CLEANUP - Current Tables' as info,
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' 
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Show table counts only for tables that exist
SELECT 'Current table counts:' as info;

-- Check and show counts for tables that might exist
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'analysis_criteria' 
        ELSE 'analysis_criteria (not found)' 
    END as table_name, 
    COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' AND TABLE_NAME = 'analysis_criteria'
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'template_assignments' 
        ELSE 'template_assignments (not found)' 
    END as table_name, 
    COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' AND TABLE_NAME = 'template_assignments'
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'teacher_progress' 
        ELSE 'teacher_progress (not found)' 
    END as table_name, 
    COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' AND TABLE_NAME = 'teacher_progress'
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'school_settings' 
        ELSE 'school_settings (not found)' 
    END as table_name, 
    COUNT(*) as count 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' AND TABLE_NAME = 'school_settings';

-- 1. Drop analysis_criteria (DEPRECATED - replaced by analysis_templates.criteria_json)
-- This table was used for legacy criteria system
DROP TABLE IF EXISTS analysis_criteria;
SELECT 'analysis_criteria table dropped (if existed)' as status;

-- 2. Drop template_assignments (UNUSED - no automatic assignment logic)
-- No references found in current codebase
DROP TABLE IF EXISTS template_assignments;
SELECT 'template_assignments table dropped (if existed)' as status;

-- 3. Drop recording_metadata (PARTIALLY UNUSED - not in current upload flow)
-- Consider keeping if you plan to implement detailed recording metadata
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS recording_metadata;
-- SELECT 'recording_metadata table dropped (if existed)' as status;

-- 4. Drop teacher_progress (UNUSED - no progress tracking implemented)
DROP TABLE IF EXISTS teacher_progress;
SELECT 'teacher_progress table dropped (if existed)' as status;

-- 5. Drop school_settings (UNUSED - no school-specific settings)
DROP TABLE IF EXISTS school_settings;
SELECT 'school_settings table dropped (if existed)' as status;

-- 6. Drop audit_log (UNUSED - using console logging instead)
-- Consider keeping if you plan to implement auditing
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS audit_log;
-- SELECT 'audit_log table dropped (if existed)' as status;

-- 7. Drop error_logs (UNUSED - using console logging instead)
-- Consider keeping if you plan to implement database error logging
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS error_logs;
-- SELECT 'error_logs table dropped (if existed)' as status;

-- Clean up any unused indexes that might reference dropped tables
-- These will fail silently if they don't exist
DROP INDEX IF EXISTS idx_templates_category_active ON analysis_templates;
DROP INDEX IF EXISTS idx_audit_user_action ON audit_log;

-- Recreate needed indexes for remaining tables
CREATE INDEX IF NOT EXISTS idx_templates_category_active ON analysis_templates(category, is_active);

-- Show remaining tables after cleanup
SELECT 
    'AFTER CLEANUP - Remaining Tables' as info,
    TABLE_NAME as table_name,
    TABLE_ROWS as estimated_rows
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'classreflect' 
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Final status
SELECT 'Database cleanup completed successfully!' as status;
SELECT 'Tables removed (if they existed): analysis_criteria, template_assignments, teacher_progress, school_settings' as removed_tables;
SELECT 'Tables preserved: recording_metadata, audit_log, error_logs (commented out - uncomment to remove)' as preserved_tables;