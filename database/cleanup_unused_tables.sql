-- ClassReflect Database Cleanup - Remove Unused Tables
-- Run this script to remove tables that are no longer used after AssemblyAI implementation

-- Backup note: Always backup your database before running this script!
-- mysqldump -h [host] -u [user] -p classreflect > backup_$(date +%Y%m%d_%H%M%S).sql

USE classreflect;

-- Show current table counts before cleanup
SELECT 
    'BEFORE CLEANUP - Table Counts' as info,
    '' as table_name,
    '' as count;

SELECT 'analysis_criteria' as table_name, COUNT(*) as count FROM analysis_criteria
UNION ALL
SELECT 'template_assignments' as table_name, COUNT(*) as count FROM template_assignments  
UNION ALL
SELECT 'recording_metadata' as table_name, COUNT(*) as count FROM recording_metadata
UNION ALL
SELECT 'teacher_progress' as table_name, COUNT(*) as count FROM teacher_progress
UNION ALL
SELECT 'school_settings' as table_name, COUNT(*) as count FROM school_settings
UNION ALL
SELECT 'audit_log' as table_name, COUNT(*) as count FROM audit_log
UNION ALL
SELECT 'error_logs' as table_name, COUNT(*) as count FROM error_logs;

-- 1. Drop analysis_criteria (DEPRECATED - replaced by analysis_templates.criteria_json)
-- This table was used for legacy criteria system
DROP TABLE IF EXISTS analysis_criteria;
SELECT 'analysis_criteria table dropped (deprecated - replaced by analysis_templates)' as status;

-- 2. Drop template_assignments (UNUSED - no automatic assignment logic)
-- No references found in current codebase
DROP TABLE IF EXISTS template_assignments;
SELECT 'template_assignments table dropped (unused)' as status;

-- 3. Drop recording_metadata (PARTIALLY UNUSED - not in current upload flow)
-- Consider keeping if you plan to implement detailed recording metadata
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS recording_metadata;
-- SELECT 'recording_metadata table dropped (unused in current flow)' as status;

-- 4. Drop teacher_progress (UNUSED - no progress tracking implemented)
DROP TABLE IF EXISTS teacher_progress;
SELECT 'teacher_progress table dropped (feature not implemented)' as status;

-- 5. Drop school_settings (UNUSED - no school-specific settings)
DROP TABLE IF EXISTS school_settings;
SELECT 'school_settings table dropped (feature not implemented)' as status;

-- 6. Drop audit_log (UNUSED - using console logging instead)
-- Consider keeping if you plan to implement auditing
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS audit_log;
-- SELECT 'audit_log table dropped (using console logging)' as status;

-- 7. Drop error_logs (UNUSED - using console logging instead)
-- Consider keeping if you plan to implement database error logging
-- Uncomment the line below to remove it:
-- DROP TABLE IF EXISTS error_logs;
-- SELECT 'error_logs table dropped (using console logging)' as status;

-- Clean up any unused indexes
-- Remove performance indexes that referenced dropped tables
DROP INDEX IF EXISTS idx_templates_category_active ON analysis_templates;
DROP INDEX IF EXISTS idx_audit_user_action ON audit_log;

-- Recreate any needed indexes for remaining tables
CREATE INDEX idx_templates_category_active ON analysis_templates(category, is_active);

-- Show remaining tables
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
SELECT 'Tables removed: analysis_criteria, template_assignments, teacher_progress, school_settings' as removed_tables;
SELECT 'Tables preserved: recording_metadata, audit_log, error_logs (commented out - uncomment to remove)' as preserved_tables;