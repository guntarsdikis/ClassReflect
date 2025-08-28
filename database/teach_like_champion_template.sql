-- Teach Like a Champion Templates for ClassReflect
-- Simple global templates that schools can use
-- Based on Doug Lemov's research-proven teaching techniques

INSERT INTO templates (
    template_name, 
    description,
    category_id,
    category, 
    grade_levels, 
    subjects, 
    is_global, 
    school_id, 
    created_by, 
    is_active
) VALUES 
(
    'Teach Like a Champion - Complete Framework',
    'Complete framework covering all 62 techniques from Doug Lemov''s research-proven teaching methods including High Academic Expectations, Planning for Success, Structuring and Delivering Lessons, and Building Character and Trust.',
    11,  -- Teaching Methods category_id
    'Teaching Methods',
    '["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]',
    '["Math", "English", "Science", "Social Studies", "Arts", "Physical Education", "Other"]',
    1,    -- is_global = true
    NULL, -- school_id = NULL for global
    NULL, -- created_by = NULL for system template
    1     -- is_active = true
),
(
    'Teach Like a Champion - Foundation Techniques',
    'Core foundation techniques from Teach Like a Champion focusing on essential classroom management and instruction methods. Ideal for new teachers or schools starting with the framework.',
    11,  -- Teaching Methods category_id  
    'Teaching Methods',
    '["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]',
    '["Math", "English", "Science", "Social Studies", "Arts", "Physical Education", "Other"]',
    1,    -- is_global = true
    NULL, -- school_id = NULL for global
    NULL, -- created_by = NULL for system template
    1     -- is_active = true
)
ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;