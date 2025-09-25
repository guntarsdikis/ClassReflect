-- Update Template Weightings Based on Teaching Effectiveness Research
-- This script replaces equal weightings with research-based priorities

USE classreflect;

-- Template 3: Foundation Techniques (19 criteria)
-- Prioritizes core classroom management and high expectations over refinement techniques

-- HIGH PRIORITY: Core Classroom Management (8-12%)
UPDATE template_criteria SET weight = 12.00 WHERE id = 39; -- Cold Call - Effectiveness (most critical)
UPDATE template_criteria SET weight = 10.00 WHERE id = 43; -- No Opt Out - Resolution Rate (high expectations)
UPDATE template_criteria SET weight = 10.00 WHERE id = 47; -- Right is Right - Precision Requests (academic standards)
UPDATE template_criteria SET weight = 8.00 WHERE id = 40;  -- Wait Time - Average Duration (fundamental thinking time)

-- MEDIUM PRIORITY: Supporting Techniques (5-7%)
UPDATE template_criteria SET weight = 7.00 WHERE id = 37;  -- Cold Call - Distribution
UPDATE template_criteria SET weight = 6.00 WHERE id = 36;  -- Cold Call - Frequency
UPDATE template_criteria SET weight = 6.00 WHERE id = 48;  -- Right is Right - Standard Consistency
UPDATE template_criteria SET weight = 6.00 WHERE id = 51;  -- Format Matters - Complete Sentences
UPDATE template_criteria SET weight = 5.00 WHERE id = 45;  -- No Opt Out - Follow Through
UPDATE template_criteria SET weight = 4.00 WHERE id = 54;  -- Format Matters - Language Progression

-- LOWER PRIORITY: Refinement Techniques (3-4%)
UPDATE template_criteria SET weight = 4.00 WHERE id = 38;  -- Cold Call - Timing
UPDATE template_criteria SET weight = 4.00 WHERE id = 41;  -- Wait Time - Consistency
UPDATE template_criteria SET weight = 4.00 WHERE id = 42;  -- Wait Time - Question Complexity Matching
UPDATE template_criteria SET weight = 3.00 WHERE id = 44;  -- No Opt Out - Method Variety
UPDATE template_criteria SET weight = 3.00 WHERE id = 46;  -- No Opt Out - Time Investment
UPDATE template_criteria SET weight = 3.00 WHERE id = 49;  -- Right is Right - Student Growth Evidence
UPDATE template_criteria SET weight = 3.00 WHERE id = 50;  -- Right is Right - Missed Opportunities
UPDATE template_criteria SET weight = 3.00 WHERE id = 52;  -- Format Matters - Academic Vocabulary
UPDATE template_criteria SET weight = 3.00 WHERE id = 53;  -- Format Matters - Format Interventions

-- Template 4: Complete Framework (16 criteria)
-- Prioritizes planning, assessment, and universal engagement over individual techniques

-- HIGH PRIORITY: Learning & Assessment (10-15%)
UPDATE template_criteria SET weight = 15.00 WHERE id = 61; -- Begin With the End (clear objectives drive everything)
UPDATE template_criteria SET weight = 12.00 WHERE id = 65; -- Exit Ticket - Learning Check (assessment critical)
UPDATE template_criteria SET weight = 10.00 WHERE id = 63; -- 100% - Universal Participation (engagement foundation)

-- MEDIUM PRIORITY: Core Techniques (6-7%)
UPDATE template_criteria SET weight = 7.00 WHERE id = 55;  -- Cold Call - Frequency
UPDATE template_criteria SET weight = 7.00 WHERE id = 58;  -- No Opt Out - Resolution Rate
UPDATE template_criteria SET weight = 6.00 WHERE id = 64;  -- What to Do - Clear Directions
UPDATE template_criteria SET weight = 6.00 WHERE id = 66;  -- Targeted Questioning
UPDATE template_criteria SET weight = 6.00 WHERE id = 59;  -- Right is Right - Precision Requests

-- LOWER PRIORITY: Supporting Elements (3-5%)
UPDATE template_criteria SET weight = 5.00 WHERE id = 56;  -- Cold Call - Distribution
UPDATE template_criteria SET weight = 5.00 WHERE id = 57;  -- Wait Time - Average Duration
UPDATE template_criteria SET weight = 4.00 WHERE id = 60;  -- Format Matters - Complete Sentences
UPDATE template_criteria SET weight = 4.00 WHERE id = 62;  -- Post It - Objective Visibility
UPDATE template_criteria SET weight = 4.00 WHERE id = 67;  -- Positive Framing
UPDATE template_criteria SET weight = 3.00 WHERE id = 68;  -- Strong Voice - Presence
UPDATE template_criteria SET weight = 3.00 WHERE id = 69;  -- Stretch It
UPDATE template_criteria SET weight = 3.00 WHERE id = 70;  -- Ratio - Student Talk Time

-- Verify total weights equal 100% for each template
SELECT
    template_id,
    COUNT(*) as criteria_count,
    ROUND(SUM(weight), 2) as total_weight,
    CASE
        WHEN ROUND(SUM(weight), 2) = 100.00 THEN '✓ CORRECT'
        ELSE '✗ NEEDS ADJUSTMENT'
    END as weight_status
FROM template_criteria
WHERE template_id IN (3, 4)
GROUP BY template_id;

-- Show updated weightings by priority level
SELECT
    t.template_name,
    tc.criteria_name,
    tc.weight as 'Weight (%)',
    CASE
        WHEN tc.weight >= 10 THEN 'HIGH PRIORITY'
        WHEN tc.weight >= 6 THEN 'MEDIUM PRIORITY'
        ELSE 'LOWER PRIORITY'
    END as priority_level,
    tc.criteria_description
FROM template_criteria tc
JOIN templates t ON tc.template_id = t.id
WHERE tc.template_id IN (3, 4)
ORDER BY tc.template_id, tc.weight DESC;

-- Update template updated_at timestamps
UPDATE templates
SET updated_at = NOW()
WHERE id IN (3, 4);

-- Log the change
INSERT INTO template_usage (template_id, action_type, created_at)
VALUES
    (3, 'weightings_updated', NOW()),
    (4, 'weightings_updated', NOW());

COMMIT;