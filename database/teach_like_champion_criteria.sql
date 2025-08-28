-- Teach Like a Champion Template Criteria
-- Based on the ClassReflect TeachLikeaChampion.md documentation
-- Creates detailed evaluation criteria for both Foundation and Complete Framework templates

-- Foundation Techniques Template (ID 11) - Tier 1 Techniques
INSERT INTO template_criteria (template_id, criteria_name, criteria_description, weight, order_index, is_active) VALUES

-- 1. Cold Call Criteria
(11, 'Cold Call - Frequency', 'Total cold calls per lesson. Target: 8-12 cold calls per 45-minute lesson. Measures teacher ability to maintain universal engagement through unpredictable questioning.', 2.00, 1, 1),
(11, 'Cold Call - Distribution', 'Percentage of students called upon. Target: 60%+ of students called at least once. Ensures equitable participation across all learners.', 2.00, 2, 1),
(11, 'Cold Call - Timing', 'Cold calls distributed throughout lesson vs clustered. Measures consistency of engagement expectations across entire lesson.', 1.50, 3, 1),
(11, 'Cold Call - Effectiveness', 'Student response rate to cold calls. Target: 90%+ receive substantive answers. Indicates successful culture of preparedness.', 2.00, 4, 1),

-- 2. Wait Time Criteria
(11, 'Wait Time - Average Duration', 'Mean pause length after questions. Target: 3-5 seconds average. Allows sufficient processing time for thoughtful responses.', 2.00, 5, 1),
(11, 'Wait Time - Consistency', 'Percentage of questions with 3+ second wait time. Target: 80%+ meet minimum threshold. Demonstrates sustained commitment to thinking time.', 2.00, 6, 1),
(11, 'Wait Time - Question Complexity Matching', 'Wait time adjusted for question difficulty. Complex questions receive longer wait times (up to 8 seconds). Shows strategic thinking about questioning.', 1.50, 7, 1),

-- 3. No Opt Out Criteria  
(11, 'No Opt Out - Resolution Rate', 'Percentage of "I don\'t know" responses successfully resolved. Target: 95%+ resolution rate. Maintains high expectations for all students.', 2.50, 8, 1),
(11, 'No Opt Out - Method Variety', 'Different support strategies used (hint, simpler question, peer help). Target: 3+ different approaches. Shows adaptive teaching skills.', 1.50, 9, 1),
(11, 'No Opt Out - Follow Through', 'Returning to original student with correct answer. Ensures student achieves success rather than avoidance.', 2.00, 10, 1),
(11, 'No Opt Out - Time Investment', 'Average time spent resolving opt-outs. Target: 45-90 seconds per resolution. Balances support with lesson pacing.', 1.00, 11, 1),

-- 4. Right is Right Criteria
(11, 'Right is Right - Precision Requests', 'Frequency of demanding more accurate answers. Target: 70%+ of imprecise answers receive precision requests. Maintains high academic standards.', 2.00, 12, 1),
(11, 'Right is Right - Standard Consistency', 'Standards maintained throughout entire lesson. Measures sustained commitment to accuracy without fatigue or compromise.', 2.00, 13, 1),
(11, 'Right is Right - Student Growth Evidence', 'Students increasingly self-correct by lesson end. Indicates internalization of high expectations.', 1.50, 14, 1),
(11, 'Right is Right - Missed Opportunities', 'Partially correct answers accepted without pushback. Identifies areas for improvement in standard maintenance.', 1.50, 15, 1),

-- 5. Format Matters Criteria
(11, 'Format Matters - Complete Sentences', 'Percentage of student responses in complete sentences. Target: 80%+ proper format. Builds academic language habits.', 2.00, 16, 1),
(11, 'Format Matters - Academic Vocabulary', 'Usage of subject-specific terms. Target: 5+ academic terms per 10-minute segment. Develops scholarly discourse.', 1.50, 17, 1),
(11, 'Format Matters - Format Interventions', 'Teacher requests for proper language format. Shows commitment to elevating student communication.', 1.50, 18, 1),
(11, 'Format Matters - Language Progression', 'Improvement in format quality from start to end of lesson. Target: 15% improvement. Evidence of responsive teaching.', 1.00, 19, 1);

-- Complete Framework Template (ID 10) - All Techniques (Tier 1 + Tier 2)
INSERT INTO template_criteria (template_id, criteria_name, criteria_description, weight, order_index, is_active) VALUES

-- Tier 1 Techniques (same as Foundation but with adjusted weights for comprehensive analysis)
-- 1. Cold Call Criteria
(10, 'Cold Call - Frequency', 'Total cold calls per lesson. Target: 8-12 cold calls per 45-minute lesson. Measures teacher ability to maintain universal engagement through unpredictable questioning.', 1.50, 1, 1),
(10, 'Cold Call - Distribution', 'Percentage of students called upon. Target: 60%+ of students called at least once. Ensures equitable participation across all learners.', 1.50, 2, 1),
(10, 'Cold Call - Timing', 'Cold calls distributed throughout lesson vs clustered. Measures consistency of engagement expectations across entire lesson.', 1.00, 3, 1),
(10, 'Cold Call - Effectiveness', 'Student response rate to cold calls. Target: 90%+ receive substantive answers. Indicates successful culture of preparedness.', 1.50, 4, 1),

-- 2. Wait Time Criteria
(10, 'Wait Time - Average Duration', 'Mean pause length after questions. Target: 3-5 seconds average. Allows sufficient processing time for thoughtful responses.', 1.50, 5, 1),
(10, 'Wait Time - Consistency', 'Percentage of questions with 3+ second wait time. Target: 80%+ meet minimum threshold. Demonstrates sustained commitment to thinking time.', 1.50, 6, 1),
(10, 'Wait Time - Question Complexity Matching', 'Wait time adjusted for question difficulty. Complex questions receive longer wait times (up to 8 seconds). Shows strategic thinking about questioning.', 1.00, 7, 1),

-- 3. No Opt Out Criteria  
(10, 'No Opt Out - Resolution Rate', 'Percentage of "I don\'t know" responses successfully resolved. Target: 95%+ resolution rate. Maintains high expectations for all students.', 2.00, 8, 1),
(10, 'No Opt Out - Method Variety', 'Different support strategies used (hint, simpler question, peer help). Target: 3+ different approaches. Shows adaptive teaching skills.', 1.00, 9, 1),
(10, 'No Opt Out - Follow Through', 'Returning to original student with correct answer. Ensures student achieves success rather than avoidance.', 1.50, 10, 1),

-- 4. Right is Right Criteria
(10, 'Right is Right - Precision Requests', 'Frequency of demanding more accurate answers. Target: 70%+ of imprecise answers receive precision requests. Maintains high academic standards.', 1.50, 11, 1),
(10, 'Right is Right - Standard Consistency', 'Standards maintained throughout entire lesson. Measures sustained commitment to accuracy without fatigue or compromise.', 1.50, 12, 1),
(10, 'Right is Right - Student Growth Evidence', 'Students increasingly self-correct by lesson end. Indicates internalization of high expectations.', 1.00, 13, 1),

-- 5. Format Matters Criteria
(10, 'Format Matters - Complete Sentences', 'Percentage of student responses in complete sentences. Target: 80%+ proper format. Builds academic language habits.', 1.50, 14, 1),
(10, 'Format Matters - Academic Vocabulary', 'Usage of subject-specific terms. Target: 5+ academic terms per 10-minute segment. Develops scholarly discourse.', 1.00, 15, 1),
(10, 'Format Matters - Format Interventions', 'Teacher requests for proper language format. Shows commitment to elevating student communication.', 1.00, 16, 1),

-- Tier 2 Advanced Techniques
-- 6. Stretch It Criteria
(10, 'Stretch It - Follow-up Frequency', 'Follow-up questions after correct answers. Target: 50%+ of correct answers receive stretch questions. Deepens student thinking beyond initial response.', 2.00, 17, 1),
(10, 'Stretch It - Question Depth', 'Quality of extension questions (Why? How do you know? What makes you think that?). Measures sophistication of intellectual challenge.', 2.00, 18, 1),
(10, 'Stretch It - Student Engagement', 'Quality of extended responses. Target: Average 2+ sentences in stretched responses. Evidence of deeper thinking activation.', 1.50, 19, 1),
(10, 'Stretch It - Missed Opportunities', 'Correct answers accepted without extension. Identifies potential for increased intellectual rigor.', 1.00, 20, 1),

-- 7. Check for Understanding Criteria
(10, 'CFU - Check Frequency', 'Understanding checks per new concept. Target: Every 5-7 minutes of new content. Ensures mastery before progression.', 2.00, 21, 1),
(10, 'CFU - Student Sampling', 'Number of students assessed per check. Target: 30%+ of students checked per concept. Provides reliable comprehension data.', 1.50, 22, 1),
(10, 'CFU - Response Quality', 'Depth of understanding demonstrated in checks. Measures effectiveness of assessment methods.', 1.50, 23, 1),
(10, 'CFU - Teaching Adjustments', 'Evidence of modifications based on understanding checks. Shows responsive, data-driven instruction.', 2.00, 24, 1),

-- 8. Positive Framing Criteria
(10, 'Positive Framing - Language Ratio', 'Positive vs negative language instances. Target: 4:1 positive to corrective ratio. Creates supportive learning environment.', 2.00, 25, 1),
(10, 'Positive Framing - Solution Focus', 'Corrections that provide clear next steps. Target: 90%+ include specific guidance. Maintains student dignity while improving performance.', 2.00, 26, 1),
(10, 'Positive Framing - Recognition Frequency', 'Affirmation of student effort and achievement. Target: 3+ affirmations per student per lesson. Builds confidence and motivation.', 1.50, 27, 1),
(10, 'Positive Framing - Tone Consistency', 'Maintaining positive approach throughout lesson. Measures emotional regulation and professional demeanor.', 1.50, 28, 1),

-- 9. Strong Voice Criteria
(10, 'Strong Voice - Economy of Language', 'Average words per direction or correction. Target: 15 words or fewer for routine directions. Demonstrates clear, authoritative communication.', 1.50, 29, 1),
(10, 'Strong Voice - Clarity Index', 'Instructions requiring repeat clarification. Target: <10% need repetition. Measures communication effectiveness.', 2.00, 30, 1),
(10, 'Strong Voice - Tone Consistency', 'Voice level and authority maintenance throughout management moments. Shows calm, confident leadership.', 1.50, 31, 1),
(10, 'Strong Voice - Management Efficiency', 'Instructional time maintained during management. Target: 90%+ instructional time preserved. Balances authority with learning focus.', 2.00, 32, 1),

-- 10. Begin with the End Criteria
(10, 'Begin with End - Objective Clarity', 'Clear, specific learning objective stated within first 3 minutes. Provides students with clear learning target.', 2.00, 33, 1),
(10, 'Begin with End - Student Understanding', 'Evidence students comprehend the learning target. Ensures shared understanding of lesson purpose.', 1.50, 34, 1),
(10, 'Begin with End - Lesson Alignment', 'Activities clearly connected to stated objective. Target: 2+ explicit references throughout lesson. Maintains focus and coherence.', 2.00, 35, 1),
(10, 'Begin with End - Closure Connection', 'Explicit return to learning goal at lesson end. Provides closure and assessment of objective achievement.', 1.50, 36, 1);