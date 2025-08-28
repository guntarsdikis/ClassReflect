-- Standardize template weights to percentage system (0-100%)
-- All weights within a template should total 100% for clear interpretation
-- This fixes the current inconsistent weight system

USE classreflect;

-- Before making changes, let's see the current state
SELECT 
    t.template_name,
    tc.criteria_name,
    tc.weight as current_weight,
    tc.order_index
FROM templates t 
JOIN template_criteria tc ON t.id = tc.template_id 
WHERE tc.is_active = 1 
ORDER BY t.id, tc.order_index;

-- Fix Template 6: "Student engagement" 
-- Current: 3 criteria with 9.99 each (total 29.97)
-- Target: Equal distribution = 33.33% each (total 100%)

UPDATE template_criteria 
SET weight = 33.33 
WHERE template_id = 6 
  AND criteria_name IN ('Classroom Energy', 'Interactive Activities') 
  AND is_active = 1;

UPDATE template_criteria 
SET weight = 33.34 
WHERE template_id = 6 
  AND criteria_name = 'Student Participation' 
  AND is_active = 1;

-- Fix Template 7: "Reading Comprehension Assessment"
-- Current: Text Analysis (2.00) + Vocabulary Understanding (1.50) = 3.50 total
-- Target: Proportional distribution to 100%
-- Text Analysis: 2.00/3.50 = 57.14%
-- Vocabulary: 1.50/3.50 = 42.86%

UPDATE template_criteria 
SET weight = 57.14 
WHERE template_id = 7 
  AND criteria_name = 'Text Analysis' 
  AND is_active = 1;

UPDATE template_criteria 
SET weight = 42.86 
WHERE template_id = 7 
  AND criteria_name = 'Vocabulary Understanding' 
  AND is_active = 1;

-- Verify the changes
SELECT 
    t.template_name,
    tc.criteria_name,
    tc.weight as new_weight,
    tc.order_index
FROM templates t 
JOIN template_criteria tc ON t.id = tc.template_id 
WHERE tc.is_active = 1 
ORDER BY t.id, tc.order_index;

-- Check that weights now total 100% per template
SELECT 
    t.id as template_id,
    t.template_name,
    ROUND(SUM(tc.weight), 2) as total_weight,
    COUNT(tc.id) as criteria_count
FROM templates t 
JOIN template_criteria tc ON t.id = tc.template_id 
WHERE tc.is_active = 1 
GROUP BY t.id, t.template_name;

-- Weight standardization completed
-- All templates should now have weights totaling 100%