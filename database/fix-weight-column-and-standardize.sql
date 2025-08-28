-- Fix weight column size and standardize weights to percentage system
-- The current DECIMAL(3,2) only allows max 9.99, but we need up to 100.00

USE classreflect;

-- Show current column definition
SELECT 'CURRENT COLUMN DEFINITION:' as info;
SHOW COLUMNS FROM template_criteria WHERE Field = 'weight';

-- Show current weights (limited by DECIMAL(3,2) to max 9.99)
SELECT 'CURRENT WEIGHTS:' as info;
SELECT id, template_id, criteria_name, weight FROM template_criteria WHERE is_active = 1 ORDER BY template_id, id;

-- Step 1: Alter the weight column to allow percentage values (0.00 to 100.00)
ALTER TABLE template_criteria 
MODIFY COLUMN weight DECIMAL(5,2) DEFAULT 1.00 
COMMENT 'Weight as percentage (0.00-100.00), template total should equal 100.00';

-- Show updated column definition
SELECT 'UPDATED COLUMN DEFINITION:' as info;
SHOW COLUMNS FROM template_criteria WHERE Field = 'weight';

-- Step 2: Now update the weights to proper percentages

-- Template 6: Student engagement (3 criteria - distribute equally)
-- Target: ~33.33% each (total = 100%)
UPDATE template_criteria SET weight = 33.33 WHERE id = 39; -- Student Participation  
UPDATE template_criteria SET weight = 33.33 WHERE id = 40; -- Interactive Activities
UPDATE template_criteria SET weight = 33.34 WHERE id = 41; -- Classroom Energy

-- Template 7: Reading Comprehension Assessment (2 criteria - distribute equally)  
-- Target: 50% each (total = 100%)
UPDATE template_criteria SET weight = 50.00 WHERE id = 36; -- Text Analysis
UPDATE template_criteria SET weight = 50.00 WHERE id = 37; -- Vocabulary Understanding

-- Show final results
SELECT 'STANDARDIZED WEIGHTS:' as info;
SELECT id, template_id, criteria_name, weight FROM template_criteria WHERE is_active = 1 ORDER BY template_id, id;

-- Verify totals equal 100% per template
SELECT 'WEIGHT TOTALS (should be 100.00):' as info;
SELECT 
    template_id,
    ROUND(SUM(weight), 2) as total_weight,
    COUNT(*) as criteria_count,
    CASE 
        WHEN ROUND(SUM(weight), 2) = 100.00 THEN '✓ Valid'
        ELSE '✗ Invalid (should total 100%)'
    END as validation_status
FROM template_criteria 
WHERE is_active = 1 
GROUP BY template_id;