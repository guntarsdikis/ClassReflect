-- Clear and Create Fresh Test Data for ClassReflect (Local Development)
-- This script clears existing data and creates clean demo school and test users

USE classreflect;

-- Disable foreign key checks for cleanup
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (in dependency order)
DELETE FROM analysis_results;
DELETE FROM transcripts;
DELETE FROM audio_jobs;
DELETE FROM users;
DELETE FROM teachers WHERE 1=1; -- Clear teachers table if it exists
DELETE FROM schools;

-- Reset auto-increment counters
ALTER TABLE schools AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Create demo school
INSERT INTO schools (
    id, 
    name, 
    domain, 
    contact_email, 
    subscription_status,
    max_teachers,
    max_monthly_uploads,
    created_at,
    updated_at
) VALUES (
    1,
    'Demo Elementary School',
    'demo-school.local',
    'admin@demo-school.local',
    'active',
    50,
    500,
    NOW(),
    NOW()
);

-- Create test users with different roles
-- 1. Super Admin (platform level)
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    school_id,
    subjects,
    grades,
    cognito_username,
    is_active,
    created_at,
    updated_at,
    last_login
) VALUES (
    1,
    'superadmin@test.local',
    'Super',
    'Admin',
    'super_admin',
    '1', -- Will be mapped from Cognito 'platform' -> 1 in code
    NULL,
    NULL,
    'superadmin-test',
    true,
    NOW(),
    NOW(),
    NULL
);

-- 2. School Manager
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    school_id,
    subjects,
    grades,
    cognito_username,
    is_active,
    created_at,
    updated_at,
    last_login
) VALUES (
    2,
    'manager@test.local',
    'School',
    'Manager',
    'school_manager',
    '1',
    NULL,
    NULL,
    'manager-test',
    true,
    NOW(),
    NOW(),
    NULL
);

-- 3. Teacher 1 - Math and Science
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    school_id,
    subjects,
    grades,
    cognito_username,
    is_active,
    created_at,
    updated_at,
    last_login
) VALUES (
    3,
    'teacher@test.local',
    'Test',
    'Teacher',
    'teacher',
    '1',
    JSON_ARRAY('Math', 'Science'),
    JSON_ARRAY('3', '4', '5'),
    'teacher-test',
    true,
    NOW(),
    NOW(),
    NULL
);

-- 4. Teacher 2 - English and History
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    role,
    school_id,
    subjects,
    grades,
    cognito_username,
    is_active,
    created_at,
    updated_at,
    last_login
) VALUES (
    4,
    'teacher2@test.local',
    'Jane',
    'Smith',
    'teacher',
    '1',
    JSON_ARRAY('English', 'History'),
    JSON_ARRAY('1', '2', '3'),
    'teacher2-test',
    true,
    NOW(),
    NOW(),
    NULL
);

-- Create some demo audio jobs for testing
INSERT INTO audio_jobs (
    id,
    teacher_id,
    school_id,
    file_name,
    s3_key,
    file_size,
    duration_seconds,
    status,
    created_at,
    updated_at
) VALUES 
(
    'job-001',
    3, -- Test Teacher
    1, -- Demo School
    'lesson_recording_1.mp3',
    'audio/school-1/teacher-3/lesson_recording_1_20240826.mp3',
    2547832,
    180,
    'completed',
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
    'job-002',
    3, -- Test Teacher
    1, -- Demo School
    'math_lesson.wav',
    'audio/school-1/teacher-3/math_lesson_20240827.wav',
    4123456,
    240,
    'completed',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
    'job-003',
    4, -- Jane Smith
    1, -- Demo School
    'english_discussion.mp3',
    'audio/school-1/teacher-4/english_discussion_20240827.mp3',
    3456789,
    300,
    'processing',
    NOW(),
    NOW()
);

-- Create demo transcripts
INSERT INTO transcripts (
    id,
    job_id,
    teacher_id,
    school_id,
    transcript_text,
    word_count,
    confidence_score,
    created_at
) VALUES 
(
    1,
    'job-001',
    3,
    1,
    'Today we are going to learn about fractions. A fraction represents a part of a whole. For example, if we have a pizza cut into 8 slices and we eat 3 slices, we have eaten 3/8 of the pizza.',
    43,
    0.92,
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
    2,
    'job-002',
    3,
    1,
    'Let\'s solve this algebra problem step by step. We have the equation 2x + 5 = 13. First, we subtract 5 from both sides to get 2x = 8. Then we divide both sides by 2 to find that x = 4.',
    41,
    0.89,
    DATE_SUB(NOW(), INTERVAL 1 DAY)
);

-- Verify the data was created correctly
SELECT 'Schools created:' as info, COUNT(*) as count FROM schools;
SELECT 'Users created:' as info, COUNT(*) as count FROM users;
SELECT 'Jobs created:' as info, COUNT(*) as count FROM audio_jobs;
SELECT 'Transcripts created:' as info, COUNT(*) as count FROM transcripts;

-- Show the users by role
SELECT 
    u.id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.role,
    s.name as school_name,
    u.cognito_username
FROM users u
LEFT JOIN schools s ON u.school_id = s.id
ORDER BY u.role, u.id;