-- ClassReflect Database Schema for Local Development
-- This is a minimal schema for testing Whisper processing

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (simplified)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('teacher', 'school_manager', 'super_admin') DEFAULT 'teacher',
    school_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Audio jobs table
CREATE TABLE IF NOT EXISTS audio_jobs (
    id VARCHAR(36) PRIMARY KEY,
    teacher_id INT,
    school_id VARCHAR(50),
    original_filename VARCHAR(255),
    s3_key VARCHAR(500),
    status ENUM('pending', 'uploading', 'queued', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at DATETIME NULL,
    processing_completed_at DATETIME NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    INDEX idx_status (status),
    INDEX idx_teacher (teacher_id),
    INDEX idx_created (created_at)
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(36) NOT NULL,
    teacher_id INT,
    school_id VARCHAR(50),
    transcript_text LONGTEXT,
    word_count INT DEFAULT 0,
    confidence_score DECIMAL(4,3) DEFAULT 0.000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_job_transcript (job_id),
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    INDEX idx_teacher (teacher_id),
    INDEX idx_job (job_id)
);

-- Insert test data
INSERT IGNORE INTO schools (id, name) VALUES 
('test-school-001', 'Test Elementary School'),
('platform', 'ClassReflect Platform');

INSERT IGNORE INTO users (id, email, first_name, last_name, role, school_id) VALUES
(1, 'teacher@test.local', 'Test', 'Teacher', 'teacher', 'test-school-001'),
(2, 'manager@test.local', 'School', 'Manager', 'school_manager', 'test-school-001'),
(3, 'admin@test.local', 'Super', 'Admin', 'super_admin', 'platform');

-- Create a sample job for testing
INSERT IGNORE INTO audio_jobs (id, teacher_id, school_id, original_filename, s3_key, status) VALUES
('test-job-123', 1, 'test-school-001', 'test-recording.wav', 'audio-files/test/test-recording.wav', 'queued');

COMMIT;