-- Create proper separation: System Subjects vs School Subjects
-- System subjects are managed by Super Admin and available to all schools
-- School subjects are managed by School Managers and specific to their school

-- 1. Create system_subjects table (managed by Super Admin)
CREATE TABLE IF NOT EXISTS system_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) DEFAULT 'General',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT, -- Super admin who created it
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_active (is_active),
  INDEX idx_category (category)
);

-- 2. Insert core system subjects (available to all schools)
INSERT INTO system_subjects (subject_name, description, category, created_by) VALUES
('Mathematics', 'Mathematical studies including algebra, geometry, and calculus', 'Core', 1),
('English Language Arts', 'Reading, writing, grammar, and literature', 'Core', 1),
('Science', 'General science studies', 'Core', 1),
('Social Studies', 'History, geography, and social sciences', 'Core', 1),
('Art', 'Visual arts and creative expression', 'Arts', 1),
('Music', 'Musical education and performance', 'Arts', 1),
('Physical Education', 'Physical fitness and sports activities', 'Health', 1),
('Computer Science', 'Programming, technology, and digital literacy', 'Technology', 1),
('History', 'Historical studies and analysis', 'Social Sciences', 1),
('Geography', 'Study of Earth and its features', 'Social Sciences', 1),
('Biology', 'Study of living organisms', 'Sciences', 1),
('Chemistry', 'Study of matter and its properties', 'Sciences', 1),
('Physics', 'Study of matter, energy, and motion', 'Sciences', 1),
('World Languages', 'Foreign language studies', 'Languages', 1),
('Health', 'Health education and wellness', 'Health', 1);

-- 3. Remove is_system_default column from school_subjects (no longer needed)
ALTER TABLE school_subjects 
DROP COLUMN is_system_default;

-- 4. Remove duplicate subjects from school_subjects that now exist as system subjects
-- Keep only truly custom school-specific subjects
DELETE FROM school_subjects 
WHERE subject_name IN (
  SELECT subject_name FROM system_subjects
);

-- 5. Add category column to school_subjects for better organization
ALTER TABLE school_subjects 
ADD COLUMN category VARCHAR(50) DEFAULT 'Custom' AFTER description;

-- 6. Update remaining school subjects to have 'Custom' category
UPDATE school_subjects 
SET category = 'Custom' 
WHERE category IS NULL OR category = '';

-- 7. Add index on category for better performance
CREATE INDEX idx_school_subjects_category ON school_subjects(category);