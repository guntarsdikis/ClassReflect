-- School-specific subjects management
-- Each school can define their own list of subjects

CREATE TABLE IF NOT EXISTS school_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  subject_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE KEY unique_school_subject (school_id, subject_name),
  INDEX idx_school_id (school_id),
  INDEX idx_active (is_active)
);

-- Insert default subjects for existing schools
INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Mathematics', 'Mathematical studies including algebra, geometry, and calculus'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Mathematics');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'English Language Arts', 'Reading, writing, grammar, and literature'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'English Language Arts');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Science', 'General science studies'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Science');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Social Studies', 'History, geography, and social sciences'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Social Studies');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Art', 'Visual arts and creative expression'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Art');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Music', 'Musical education and performance'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Music');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Physical Education', 'Physical fitness and sports activities'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Physical Education');

INSERT INTO school_subjects (school_id, subject_name, description) 
SELECT s.id, 'Computer Science', 'Programming, technology, and digital literacy'
FROM schools s 
WHERE NOT EXISTS (SELECT 1 FROM school_subjects ss WHERE ss.school_id = s.id AND ss.subject_name = 'Computer Science');