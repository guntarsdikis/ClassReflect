-- Create template_categories table for manageable template categories per school
-- Each school can create, edit, and delete their own template categories

-- 1. Create template_categories table
CREATE TABLE IF NOT EXISTS template_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT NULL, -- for UI theming (optional)
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY unique_template_category_per_school (school_id, category_name),
  INDEX idx_school_template_active (school_id, is_active),
  INDEX idx_template_category_name (category_name)
);

-- 2. Insert default template categories for existing schools
INSERT IGNORE INTO template_categories (school_id, category_name, description, created_by) 
SELECT 
    s.id as school_id,
    category_data.category_name,
    category_data.description,
    1 as created_by -- assuming user ID 1 is super admin
FROM schools s
CROSS JOIN (
    SELECT 'General Assessment' as category_name, 'General teaching assessment templates' as description
    UNION ALL SELECT 'Lesson Observation', 'Classroom lesson observation templates'
    UNION ALL SELECT 'Student Engagement', 'Templates focused on student engagement and participation'
    UNION ALL SELECT 'Teaching Methods', 'Templates for evaluating teaching methodologies'
    UNION ALL SELECT 'Classroom Management', 'Templates for classroom organization and management'
    UNION ALL SELECT 'Curriculum Delivery', 'Templates for assessing curriculum implementation'
    UNION ALL SELECT 'Professional Development', 'Templates for teacher growth and development'
    UNION ALL SELECT 'Custom', 'Custom school-specific templates'
) as category_data
WHERE s.subscription_status = 'active';

-- 3. Add foreign key constraint to existing templates category_id column
-- (The column already exists, just need to add the constraint)
ALTER TABLE templates 
ADD FOREIGN KEY fk_template_category (category_id) REFERENCES template_categories(id);

-- 4. Update existing templates to link with their corresponding categories
-- Link templates to their matching categories based on the category string field
UPDATE templates t
JOIN template_categories tc ON t.school_id = tc.school_id AND t.category = tc.category_name
SET t.category_id = tc.id
WHERE t.category_id IS NULL AND t.category IS NOT NULL;

-- 5. Simplify school_subjects by removing category_id foreign key and keeping just category as text
-- First, remove the foreign key constraint
ALTER TABLE school_subjects DROP FOREIGN KEY school_subjects_ibfk_3;
ALTER TABLE school_subjects DROP COLUMN category_id;

-- 6. Remove the school_categories table since categories should be for templates, not subjects
DROP TABLE IF EXISTS school_categories;