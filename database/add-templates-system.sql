-- Add feedback templates system to ClassReflect database
-- This extends the existing analysis_criteria table with a full templates system

USE classreflect;

-- Templates table - stores reusable evaluation templates
CREATE TABLE IF NOT EXISTS templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    grade_levels JSON, -- Array of grade levels: ["K", "1", "2", ...]
    subjects JSON,     -- Array of subjects: ["Math", "Science", ...]
    is_global BOOLEAN DEFAULT FALSE, -- Global templates available to all schools
    school_id INT NULL, -- NULL for global templates, specific school ID for school-specific
    created_by INT NULL, -- User ID who created the template
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0, -- Track how many times template has been applied
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_is_global (is_global),
    INDEX idx_school_id (school_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Template criteria - specific criteria within each template
CREATE TABLE IF NOT EXISTS template_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    criteria_id INT NULL, -- Link to existing analysis_criteria if copying
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    weight DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0, -- For ordering criteria within template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES analysis_criteria(id) ON DELETE SET NULL,
    INDEX idx_template_id (template_id),
    INDEX idx_is_active (is_active),
    INDEX idx_order (order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Template usage tracking - track when templates are applied to schools
CREATE TABLE IF NOT EXISTS template_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    school_id INT NOT NULL,
    applied_by INT NULL, -- User ID who applied the template
    criteria_added INT DEFAULT 0, -- Number of criteria added when applied
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_template_id (template_id),
    INDEX idx_school_id (school_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

