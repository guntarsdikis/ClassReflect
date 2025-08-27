-- ClassReflect Database Schema
-- Aurora MySQL Database

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS classreflect;
USE classreflect;

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    contact_email VARCHAR(255),
    subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
    subscription_expires DATE,
    max_teachers INT DEFAULT 10,
    max_monthly_uploads INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subscription_status (subscription_status),
    INDEX idx_domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('teacher', 'admin', 'super_admin') DEFAULT 'teacher',
    status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_school_id (school_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audio jobs table for processing queue
CREATE TABLE IF NOT EXISTS audio_jobs (
    id VARCHAR(36) PRIMARY KEY, -- UUID
    teacher_id INT NOT NULL,
    school_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_url VARCHAR(500),
    s3_key VARCHAR(500),
    duration_seconds INT,
    status ENUM('pending', 'uploading', 'queued', 'processing', 'completed', 'failed') DEFAULT 'pending',
    error_message TEXT,
    sqs_message_id VARCHAR(255),
    processing_started_at TIMESTAMP NULL,
    processing_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_school_id (school_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    school_id INT NOT NULL,
    transcript_text LONGTEXT,
    word_count INT,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2),
    processing_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_job_id (job_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transcript_id INT NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    school_id INT NOT NULL,
    overall_score DECIMAL(5,2),
    strengths JSON,
    improvements JSON,
    detailed_feedback JSON,
    ai_model VARCHAR(50) DEFAULT 'gpt-4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_transcript_id (transcript_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analysis criteria per school
CREATE TABLE IF NOT EXISTS analysis_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    weight DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_school_id (school_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher progress tracking
CREATE TABLE IF NOT EXISTS teacher_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    school_id INT NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_uploads INT DEFAULT 0,
    average_score DECIMAL(5,2),
    total_duration_minutes INT DEFAULT 0,
    strengths_summary JSON,
    improvements_summary JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_month (teacher_id, month_year),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_month_year (month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys table for service authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    description VARCHAR(255),
    permissions JSON,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    INDEX idx_key_prefix (key_prefix),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

