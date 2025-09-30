-- Add template_id and analysis tracking to audio_jobs table
-- Run this migration to enable job status tracking and template-based analysis

USE classreflect;

-- Add template_id column to link upload with selected template
ALTER TABLE audio_jobs
ADD COLUMN IF NOT EXISTS template_id INT NULL AFTER grade,
ADD INDEX IF NOT EXISTS idx_template_id (template_id);

-- Add analysis_status to track analysis progress separately from transcription
ALTER TABLE audio_jobs
ADD COLUMN IF NOT EXISTS analysis_status ENUM('pending', 'queued', 'processing', 'completed', 'failed', 'skipped') DEFAULT 'pending' AFTER status,
ADD INDEX IF NOT EXISTS idx_analysis_status (analysis_status);

-- Add analysis timestamps
ALTER TABLE audio_jobs
ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMP NULL AFTER processing_completed_at,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP NULL AFTER analysis_started_at;

-- Add columns for storing AssemblyAI references (if not exist)
ALTER TABLE audio_jobs
ADD COLUMN IF NOT EXISTS assemblyai_upload_url VARCHAR(500) NULL AFTER s3_key,
ADD COLUMN IF NOT EXISTS assemblyai_transcript_id VARCHAR(100) NULL AFTER assemblyai_upload_url;

-- Add class metadata columns (if not exist from previous migrations)
ALTER TABLE audio_jobs
ADD COLUMN IF NOT EXISTS class_name VARCHAR(255) NULL AFTER school_id,
ADD COLUMN IF NOT EXISTS subject VARCHAR(100) NULL AFTER class_name,
ADD COLUMN IF NOT EXISTS grade VARCHAR(20) NULL AFTER subject,
ADD COLUMN IF NOT EXISTS class_duration_minutes INT NULL AFTER grade,
ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER class_duration_minutes;

-- Add external_id to transcripts (AssemblyAI transcript ID)
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100) NULL AFTER transcript_text,
ADD INDEX IF NOT EXISTS idx_external_id (external_id);

-- Update status enum to include more granular stages
-- Note: This will only work if existing values are compatible
-- ALTER TABLE audio_jobs
-- MODIFY COLUMN status ENUM('pending', 'uploading', 'queued', 'transcribing', 'transcribed', 'analyzing', 'completed', 'failed') DEFAULT 'pending';

-- For safety, add a new status field instead of modifying enum (optional approach)
-- ALTER TABLE audio_jobs ADD COLUMN processing_stage VARCHAR(50) DEFAULT 'pending' AFTER status;

SELECT 'Migration completed successfully!' as result;