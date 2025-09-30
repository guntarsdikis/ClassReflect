-- Add template_id and analysis tracking to audio_jobs table
-- Safe migration that checks for existing columns

USE classreflect;

-- Add template_id column (safe - checks if exists first)
SET @dbname = 'classreflect';
SET @tablename = 'audio_jobs';
SET @columnname = 'template_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN template_id INT NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add analysis_status column (safe)
SET @columnname = 'analysis_status';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN analysis_status ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'skipped') DEFAULT 'pending'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add analysis_started_at column (safe)
SET @columnname = 'analysis_started_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN analysis_started_at TIMESTAMP NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add analysis_completed_at column (safe)
SET @columnname = 'analysis_completed_at';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN analysis_completed_at TIMESTAMP NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add assemblyai_upload_url column (safe)
SET @columnname = 'assemblyai_upload_url';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN assemblyai_upload_url VARCHAR(500) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add assemblyai_transcript_id column (safe)
SET @columnname = 'assemblyai_transcript_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE audio_jobs ADD COLUMN assemblyai_transcript_id VARCHAR(100) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add external_id to transcripts (safe)
SET @tablename = 'transcripts';
SET @columnname = 'external_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)) > 0,
  "SELECT 1",
  "ALTER TABLE transcripts ADD COLUMN external_id VARCHAR(100) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add indexes (will fail silently if they exist)
ALTER TABLE audio_jobs ADD INDEX idx_template_id (template_id);
ALTER TABLE audio_jobs ADD INDEX idx_analysis_status (analysis_status);
ALTER TABLE transcripts ADD INDEX idx_external_id (external_id);

SELECT 'Migration completed successfully!' as result;