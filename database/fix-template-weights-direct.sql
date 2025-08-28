-- Direct fix for template weights using actual IDs
-- Standardize to percentage system where each template totals 100%

USE classreflect;

-- Show current state
SELECT 'BEFORE CHANGES:' as status;
SELECT id, template_id, criteria_name, weight FROM template_criteria WHERE is_active = 1 ORDER BY template_id, id;

-- Template 6: Student engagement (3 criteria - distribute equally)
-- IDs: 39, 40, 41
-- Target: 33.33%, 33.33%, 33.34% (total = 100%)

UPDATE template_criteria SET weight = 33.33 WHERE id = 39; -- Student Participation  
UPDATE template_criteria SET weight = 33.33 WHERE id = 40; -- Interactive Activities
UPDATE template_criteria SET weight = 33.34 WHERE id = 41; -- Classroom Energy

-- Template 7: Reading Comprehension Assessment (2 criteria)  
-- IDs: 36, 37 - both currently 9.99, so distribute equally
-- Target: 50%, 50% (total = 100%)

UPDATE template_criteria SET weight = 50.00 WHERE id = 36; -- Text Analysis
UPDATE template_criteria SET weight = 50.00 WHERE id = 37; -- Vocabulary Understanding

-- Show results
SELECT 'AFTER CHANGES:' as status;
SELECT id, template_id, criteria_name, weight FROM template_criteria WHERE is_active = 1 ORDER BY template_id, id;

-- Verify totals
SELECT 'WEIGHT TOTALS BY TEMPLATE:' as status;
SELECT 
    template_id,
    ROUND(SUM(weight), 2) as total_weight,
    COUNT(*) as criteria_count
FROM template_criteria 
WHERE is_active = 1 
GROUP BY template_id;