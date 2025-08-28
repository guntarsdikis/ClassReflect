-- Add analysis_jobs table for background template analysis processing
-- This table tracks the status of AI analysis jobs that run in the background

USE classreflect;

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    transcript_id INT NOT NULL,
    template_id INT NOT NULL,
    teacher_id INT NOT NULL,
    school_id INT NOT NULL,
    job_id VARCHAR(36) NOT NULL, -- Reference to original audio_jobs.id
    applied_by INT NOT NULL, -- User who initiated the analysis
    
    -- Job Status and Progress
    status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
    progress_percent INT DEFAULT 0,
    error_message TEXT NULL,
    
    -- Processing Timeline
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Results (populated when completed)
    overall_score DECIMAL(5,2) NULL,
    strengths JSON NULL,
    improvements JSON NULL,
    detailed_feedback JSON NULL,
    ai_model VARCHAR(50) DEFAULT 'anthropic/claude-sonnet-4-20250514',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for Performance
    INDEX idx_status (status),
    INDEX idx_transcript_id (transcript_id),
    INDEX idx_template_id (template_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_school_id (school_id),
    INDEX idx_applied_by (applied_by),
    INDEX idx_created_at (created_at),
    INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for efficient polling queries
CREATE INDEX idx_analysis_jobs_queue ON analysis_jobs(status, queued_at);
CREATE INDEX idx_analysis_jobs_progress ON analysis_jobs(status, progress_percent, updated_at);

-- Create view for job status with template and user info
CREATE VIEW analysis_job_status AS
SELECT 
    aj.id,
    aj.status,
    aj.progress_percent,
    aj.queued_at,
    aj.started_at,
    aj.completed_at,
    aj.error_message,
    aj.overall_score,
    t.template_name,
    t.category as template_category,
    u1.first_name as teacher_first_name,
    u1.last_name as teacher_last_name,
    u2.first_name as applied_by_first_name,
    u2.last_name as applied_by_last_name,
    tr.word_count,
    auj.class_name,
    auj.subject,
    auj.grade
FROM analysis_jobs aj
LEFT JOIN templates t ON aj.template_id = t.id
LEFT JOIN users u1 ON aj.teacher_id = u1.id
LEFT JOIN users u2 ON aj.applied_by = u2.id
LEFT JOIN transcripts tr ON aj.transcript_id = tr.id
LEFT JOIN audio_jobs auj ON aj.job_id = auj.id;