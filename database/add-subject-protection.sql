-- Add protection for system default subjects
-- School managers should not be able to delete core educational subjects

-- Add is_system_default column to protect core subjects
ALTER TABLE school_subjects 
ADD COLUMN is_system_default BOOLEAN DEFAULT FALSE AFTER is_active;

-- Mark existing default subjects as system defaults (protected)
UPDATE school_subjects 
SET is_system_default = TRUE 
WHERE subject_name IN (
  'Mathematics',
  'English Language Arts', 
  'Science',
  'Social Studies',
  'Art',
  'Music',
  'Physical Education',
  'Computer Science'
);

-- Add index for faster queries on system defaults
CREATE INDEX idx_system_default ON school_subjects(is_system_default);