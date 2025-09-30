-- Migration: Add analysis status tracking to audio_jobs table
-- This migration adds columns needed for tracking AI analysis progress
-- Generated: 2025-09-30
-- Safe to run multiple times (checks if columns exist first)

-- Add template_id column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND COLUMN_NAME = 'template_id') = 0,
    'ALTER TABLE audio_jobs ADD COLUMN template_id INT DEFAULT NULL AFTER s3_key',
    'SELECT "Column template_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add analysis_status column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND COLUMN_NAME = 'analysis_status') = 0,
    'ALTER TABLE audio_jobs ADD COLUMN analysis_status ENUM(''pending'',''queued'',''processing'',''completed'',''failed'',''skipped'') DEFAULT ''pending'' AFTER template_id',
    'SELECT "Column analysis_status already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add analysis_started_at column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND COLUMN_NAME = 'analysis_started_at') = 0,
    'ALTER TABLE audio_jobs ADD COLUMN analysis_started_at TIMESTAMP NULL DEFAULT NULL AFTER analysis_status',
    'SELECT "Column analysis_started_at already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add analysis_completed_at column if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND COLUMN_NAME = 'analysis_completed_at') = 0,
    'ALTER TABLE audio_jobs ADD COLUMN analysis_completed_at TIMESTAMP NULL DEFAULT NULL AFTER analysis_started_at',
    'SELECT "Column analysis_completed_at already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on template_id for faster lookups
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND INDEX_NAME = 'idx_template_id') = 0,
    'ALTER TABLE audio_jobs ADD INDEX idx_template_id (template_id)',
    'SELECT "Index idx_template_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on analysis_status for faster filtering
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'audio_jobs'
     AND INDEX_NAME = 'idx_analysis_status') = 0,
    'ALTER TABLE audio_jobs ADD INDEX idx_analysis_status (analysis_status)',
    'SELECT "Index idx_analysis_status already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'audio_jobs'
    AND COLUMN_NAME IN ('template_id', 'analysis_status', 'analysis_started_at', 'analysis_completed_at')
ORDER BY ORDINAL_POSITION;