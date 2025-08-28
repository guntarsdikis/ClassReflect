-- Create school_categories table for manageable categories per school
-- Each school can create, edit, and delete their own subject categories

CREATE TABLE IF NOT EXISTS school_categories (
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
  UNIQUE KEY unique_category_per_school (school_id, category_name),
  INDEX idx_school_active (school_id, is_active),
  INDEX idx_category_name (category_name)
);

-- Insert default categories for existing schools
-- This provides a starting point for each school
INSERT IGNORE INTO school_categories (school_id, category_name, description, created_by) 
SELECT 
    s.id as school_id,
    category_data.category_name,
    category_data.description,
    1 as created_by -- assuming user ID 1 is super admin
FROM schools s
CROSS JOIN (
    SELECT 'Core' as category_name, 'Essential core subjects' as description
    UNION ALL SELECT 'Sciences', 'Science and laboratory subjects'
    UNION ALL SELECT 'Arts', 'Creative and artistic subjects' 
    UNION ALL SELECT 'Languages', 'Foreign language subjects'
    UNION ALL SELECT 'Technology', 'Computer science and technology subjects'
    UNION ALL SELECT 'Health', 'Physical education and health subjects'
    UNION ALL SELECT 'Social Sciences', 'History, geography, and social studies'
    UNION ALL SELECT 'Custom', 'Custom school-specific subjects'
) as category_data
WHERE s.subscription_status = 'active';

-- Update existing school_subjects to use category IDs from school_categories
-- This will ensure referential integrity between subjects and categories
ALTER TABLE school_subjects 
ADD COLUMN category_id INT AFTER category,
ADD FOREIGN KEY (category_id) REFERENCES school_categories(id);

-- Update existing subjects to link with their corresponding categories
UPDATE school_subjects ss
JOIN school_categories sc ON ss.school_id = sc.school_id AND ss.category = sc.category_name
SET ss.category_id = sc.id
WHERE ss.category IS NOT NULL;

-- For subjects without matching categories, assign them to 'Custom' category
UPDATE school_subjects ss
JOIN school_categories sc ON ss.school_id = sc.school_id AND sc.category_name = 'Custom'
SET ss.category_id = sc.id
WHERE ss.category_id IS NULL;

-- Now we can make category_id NOT NULL since all subjects should have a category
-- ALTER TABLE school_subjects MODIFY COLUMN category_id INT NOT NULL;

-- Keep the old category column for now during transition, can remove later
-- ALTER TABLE school_subjects DROP COLUMN category;