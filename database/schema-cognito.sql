-- ClassReflect Database Schema - Cognito Integration
-- Aurora MySQL Database with AWS Cognito Authentication
-- This schema supports the controlled access model with hierarchical user management

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS classreflect;
USE classreflect;

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    contact_email VARCHAR(255),
    subscription_tier ENUM('basic', 'professional', 'enterprise') DEFAULT 'basic',
    subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
    subscription_expires DATE,
    max_teachers INT DEFAULT 10,
    max_monthly_uploads INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subscription_status (subscription_status),
    INDEX idx_domain (domain),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table (unified for all user types)
-- This table syncs with AWS Cognito but maintains local data
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('teacher', 'school_manager', 'super_admin') NOT NULL,
    school_id VARCHAR(36) NOT NULL, -- For super_admin, use 'platform'
    subjects JSON, -- Array of subjects for teachers
    grades JSON, -- Array of grades for teachers  
    cognito_username VARCHAR(255), -- Cognito User Pool username
    password_hash VARCHAR(255), -- Fallback for non-Cognito auth (dev/testing)
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_school_id (school_id),
    INDEX idx_cognito_username (cognito_username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analysis templates table
-- Stores evaluation criteria templates that can be global or school-specific
CREATE TABLE IF NOT EXISTS analysis_templates (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()), -- UUID
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'elementary', 'middle_school', 'high_school', etc.
    grade_levels JSON, -- Array of applicable grades
    subject_areas JSON, -- Array of applicable subjects
    criteria_json JSON NOT NULL, -- Full criteria configuration
    is_global BOOLEAN DEFAULT FALSE, -- Global templates vs school-specific
    school_id VARCHAR(36), -- NULL for global templates
    created_by INT, -- User who created this template
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    parent_template_id VARCHAR(36), -- For template inheritance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (parent_template_id) REFERENCES analysis_templates(id),
    INDEX idx_category (category),
    INDEX idx_is_global (is_global),
    INDEX idx_school_id (school_id),
    INDEX idx_is_active (is_active),
    CONSTRAINT template_school_check CHECK (
        (is_global = TRUE AND school_id IS NULL) OR
        (is_global = FALSE AND school_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audio jobs table for processing queue
CREATE TABLE IF NOT EXISTS audio_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id INT NOT NULL,
    uploaded_by_user_id INT NOT NULL, -- School manager who uploaded
    school_id VARCHAR(36) NOT NULL,
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
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_uploaded_by (uploaded_by_user_id),
    INDEX idx_school_id (school_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recording metadata table
-- Stores the evaluation criteria and context for each recording
CREATE TABLE IF NOT EXISTS recording_metadata (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    audio_job_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    uploaded_by_user_id INT NOT NULL,
    teacher_id INT NOT NULL,
    class_size INTEGER,
    subject VARCHAR(100),
    grade VARCHAR(20),
    session_type VARCHAR(100), -- 'instruction', 'discussion', 'lab', 'assessment'
    learning_objectives TEXT,
    special_considerations TEXT,
    custom_variables JSON, -- Additional context data
    curriculum_standards JSON, -- Array of standards
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES analysis_templates(id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    INDEX idx_audio_job_id (audio_job_id),
    INDEX idx_template_id (template_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_uploaded_by (uploaded_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Template assignments table
-- Defines default templates for teachers/subjects
CREATE TABLE IF NOT EXISTS template_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id INT NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    assigned_by INT, -- School manager who made the assignment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES analysis_templates(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_teacher_subject_grade (teacher_id, subject_area, grade_level),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_template_id (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(36) NOT NULL,
    teacher_id INT NOT NULL,
    school_id VARCHAR(36) NOT NULL,
    transcript_text LONGTEXT,
    word_count INT,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2),
    processing_time_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
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
    school_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL, -- Which template was used
    overall_score DECIMAL(5,2),
    category_scores JSON, -- Detailed scores per evaluation category
    strengths JSON,
    improvements JSON,
    detailed_feedback JSON,
    ai_model VARCHAR(50) DEFAULT 'gpt-4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES analysis_templates(id),
    INDEX idx_transcript_id (transcript_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_template_id (template_id),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analysis criteria per school (legacy support - may be deprecated)
CREATE TABLE IF NOT EXISTS analysis_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id VARCHAR(36) NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    weight DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_school_id (school_id),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher progress tracking
CREATE TABLE IF NOT EXISTS teacher_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    school_id VARCHAR(36) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_uploads INT DEFAULT 0,
    average_score DECIMAL(5,2),
    total_duration_minutes INT DEFAULT 0,
    strengths_summary JSON,
    improvements_summary JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_month (teacher_id, month_year),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_month_year (month_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- School settings table
CREATE TABLE IF NOT EXISTS school_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    school_id VARCHAR(36) NOT NULL UNIQUE,
    default_template_id VARCHAR(36), -- Default analysis template
    auto_analysis BOOLEAN DEFAULT TRUE,
    retention_days INTEGER DEFAULT 365,
    features_enabled JSON DEFAULT ('{"bulk_upload": true, "api_access": false}'),
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (default_template_id) REFERENCES analysis_templates(id),
    INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table for compliance and security
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'UPLOAD_FILE', etc.
    resource_type VARCHAR(100) NOT NULL, -- 'user', 'school', 'template', 'recording', etc.
    resource_id VARCHAR(36), -- ID of the affected resource
    changes JSON, -- Details of what changed
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_resource_id (resource_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Error logs table for system debugging
CREATE TABLE IF NOT EXISTS error_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_data JSON,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_error_type (error_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default global analysis templates
-- These are provided by the platform for all schools
INSERT INTO analysis_templates (
    id, template_name, category, grade_levels, subject_areas, criteria_json, 
    is_global, school_id, created_by, is_active
) VALUES 
(
    UUID(),
    'Elementary Math Instruction',
    'elementary',
    '["1", "2", "3", "4", "5"]',
    '["mathematics"]',
    '{
        "evaluation_categories": [
            {
                "name": "Student Engagement",
                "weight": 0.30,
                "metrics": ["participation_rate", "question_frequency", "student_talk_time"]
            },
            {
                "name": "Instruction Clarity",
                "weight": 0.25,
                "metrics": ["clear_directions", "concept_explanation", "vocabulary_usage"]
            },
            {
                "name": "Classroom Management",
                "weight": 0.20,
                "metrics": ["transition_efficiency", "behavior_redirects", "positive_reinforcement"]
            },
            {
                "name": "Learning Assessment",
                "weight": 0.25,
                "metrics": ["check_understanding", "formative_assessment", "feedback_quality"]
            }
        ],
        "keywords_to_track": [
            "excellent", "good job", "well done",
            "let us think about", "can you explain",
            "who can tell me", "what do you think"
        ],
        "interaction_patterns": {
            "ideal_teacher_talk_ratio": 0.4,
            "minimum_wait_time": 3,
            "questions_per_10min": 5
        }
    }',
    TRUE,
    NULL,
    NULL,
    TRUE
),
(
    UUID(),
    'Middle School Science Lab',
    'middle_school',
    '["6", "7", "8"]',
    '["science", "biology", "chemistry", "physics"]',
    '{
        "evaluation_categories": [
            {
                "name": "Safety Procedures",
                "weight": 0.35,
                "metrics": ["safety_reminders", "equipment_handling", "emergency_awareness"]
            },
            {
                "name": "Scientific Inquiry",
                "weight": 0.30,
                "metrics": ["hypothesis_formation", "observation_skills", "data_collection"]
            },
            {
                "name": "Collaboration",
                "weight": 0.20,
                "metrics": ["group_work", "peer_discussion", "shared_responsibility"]
            },
            {
                "name": "Concept Understanding",
                "weight": 0.15,
                "metrics": ["explanation_quality", "vocabulary_use", "connections"]
            }
        ],
        "keywords_to_track": [
            "hypothesis", "observe", "predict",
            "safety first", "work together", "what do you notice"
        ],
        "interaction_patterns": {
            "ideal_teacher_talk_ratio": 0.3,
            "minimum_wait_time": 5,
            "questions_per_10min": 8
        }
    }',
    TRUE,
    NULL,
    NULL,
    TRUE
),
(
    UUID(),
    'High School English Discussion',
    'high_school',
    '["9", "10", "11", "12"]',
    '["english", "literature", "language_arts"]',
    '{
        "evaluation_categories": [
            {
                "name": "Critical Thinking",
                "weight": 0.40,
                "metrics": ["analysis_depth", "evidence_usage", "argumentation"]
            },
            {
                "name": "Discussion Facilitation",
                "weight": 0.30,
                "metrics": ["student_participation", "balanced_discussion", "follow_up_questions"]
            },
            {
                "name": "Text Analysis",
                "weight": 0.20,
                "metrics": ["textual_evidence", "interpretation", "context_understanding"]
            },
            {
                "name": "Communication Skills",
                "weight": 0.10,
                "metrics": ["articulation", "listening", "respectful_discourse"]
            }
        ],
        "keywords_to_track": [
            "what evidence", "how does this connect", "build on that idea",
            "alternative perspective", "textual support", "analyze"
        ],
        "interaction_patterns": {
            "ideal_teacher_talk_ratio": 0.25,
            "minimum_wait_time": 7,
            "questions_per_10min": 6
        }
    }',
    TRUE,
    NULL,
    NULL,
    TRUE
)
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial super admin user (to be created via Cognito)
-- This is just a placeholder record - actual creation happens via API
INSERT INTO users (
    email, first_name, last_name, role, school_id, is_active
) VALUES (
    'admin@classreflect.gdwd.co.uk',
    'Super',
    'Admin', 
    'super_admin',
    'platform',
    TRUE
) ON DUPLICATE KEY UPDATE id=id;

-- Performance optimization indexes
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_audio_jobs_teacher_status ON audio_jobs(teacher_id, status);
CREATE INDEX idx_templates_category_active ON analysis_templates(category, is_active);
CREATE INDEX idx_audit_user_action ON audit_log(user_id, action);

-- Create views for common queries
CREATE VIEW teacher_summary AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.school_id,
    s.name as school_name,
    u.subjects,
    u.grades,
    u.is_active,
    u.last_login,
    COUNT(aj.id) as total_recordings,
    AVG(ar.overall_score) as average_score
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
LEFT JOIN audio_jobs aj ON u.id = aj.teacher_id
LEFT JOIN analysis_results ar ON aj.id = ar.job_id
WHERE u.role = 'teacher'
GROUP BY u.id;

CREATE VIEW school_analytics AS
SELECT 
    s.id,
    s.name,
    s.subscription_tier,
    s.max_teachers,
    s.max_monthly_uploads,
    COUNT(DISTINCT u.id) as active_teachers,
    COUNT(DISTINCT aj.id) as total_recordings,
    COUNT(DISTINCT DATE_FORMAT(aj.created_at, '%Y-%m')) as active_months,
    AVG(ar.overall_score) as school_average_score
FROM schools s
LEFT JOIN users u ON s.id = u.school_id AND u.role = 'teacher' AND u.is_active = TRUE
LEFT JOIN audio_jobs aj ON u.id = aj.teacher_id
LEFT JOIN analysis_results ar ON aj.id = ar.job_id
WHERE s.is_active = TRUE
GROUP BY s.id;