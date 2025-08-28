-- Update Teach Like a Champion criteria descriptions to be effective LeMUR analysis prompts
-- Optimized for Claude Sonnet 4 analysis via AssemblyAI LeMUR

-- Foundation Template (ID 11) - Tier 1 Techniques
UPDATE template_criteria SET criteria_description = 
'Analyze the transcript for Cold Call frequency. Look for instances where the teacher calls on students by name without them raising their hands. Count total cold calls and evaluate if they meet the target of 8-12 per 45-minute lesson. Consider: How many times does the teacher use unexpected questioning? Are students consistently prepared to respond? Provide specific examples with approximate timestamps if available.'
WHERE template_id = 11 AND criteria_name = 'Cold Call - Frequency';

UPDATE template_criteria SET criteria_description = 
'Examine how Cold Call questions are distributed among students. Identify different student voices/names called upon and calculate what percentage of the class participated. Target: 60%+ of students called at least once. Look for evidence of: Equitable participation, avoidance of calling only on eager volunteers, systematic inclusion of all learners.'
WHERE template_id = 11 AND criteria_name = 'Cold Call - Distribution';

UPDATE template_criteria SET criteria_description = 
'Evaluate the timing pattern of Cold Calls throughout the lesson. Are they spread evenly or clustered in certain sections? Look for: Cold calls in opening, middle, and closing of lesson. Consistent engagement expectations maintained throughout. Evidence that teacher uses Cold Call as ongoing engagement strategy, not just occasionally.'
WHERE template_id = 11 AND criteria_name = 'Cold Call - Timing';

UPDATE template_criteria SET criteria_description = 
'Assess student response quality and success rate to Cold Calls. Target: 90%+ receive substantive answers. Analyze: How often students provide meaningful responses when called unexpectedly. Evidence of a culture where students are prepared to participate. Student confidence and engagement when called upon without warning.'
WHERE template_id = 11 AND criteria_name = 'Cold Call - Effectiveness';

UPDATE template_criteria SET criteria_description = 
'Measure the pause duration between teacher questions and calling on students or accepting responses. Target: 3-5 seconds average. Count instances of adequate wait time (3+ seconds) vs rushed questions (<2 seconds). Look for evidence that teacher allows sufficient processing time for thoughtful responses.'
WHERE template_id = 11 AND criteria_name = 'Wait Time - Average Duration';

UPDATE template_criteria SET criteria_description = 
'Analyze consistency of wait time across different questions. Target: 80%+ of questions receive minimum 3-second wait time. Look for: Sustained commitment to thinking time, avoiding the tendency to fill silence quickly, evidence that teacher values student thinking over rapid responses.'
WHERE template_id = 11 AND criteria_name = 'Wait Time - Consistency';

UPDATE template_criteria SET criteria_description = 
'Evaluate whether wait time is appropriately adjusted based on question complexity. Complex questions should receive longer wait times (5-8 seconds). Look for: Strategic thinking about questioning depth, appropriate patience for higher-order thinking questions, differentiated wait time based on cognitive demand.'
WHERE template_id = 11 AND criteria_name = 'Wait Time - Question Complexity Matching';

UPDATE template_criteria SET criteria_description = 
'Identify instances where students say "I don\'t know" or give incorrect answers, then track teacher follow-through. Target: 95%+ resolution rate. Look for: Teacher persistence in helping students reach correct answers, use of scaffolding or hints, returning to original student after getting help from others, maintaining high expectations for all learners.'
WHERE template_id = 11 AND criteria_name = 'No Opt Out - Resolution Rate';

UPDATE template_criteria SET criteria_description = 
'Analyze the variety of support strategies used when students opt out. Target: 3+ different approaches (hints, simpler questions, peer help, think-pair-share, etc.). Look for: Adaptive teaching skills, creative problem-solving, differentiated support methods, teacher flexibility in helping struggling students succeed.'
WHERE template_id = 11 AND criteria_name = 'No Opt Out - Method Variety';

UPDATE template_criteria SET criteria_description = 
'Track whether teacher returns to original student with correct answer after getting help from others. This ensures the struggling student ultimately achieves success rather than avoidance. Look for: Complete follow-through on No Opt Out, student confidence building, accountability maintained for original student.'
WHERE template_id = 11 AND criteria_name = 'No Opt Out - Follow Through';

UPDATE template_criteria SET criteria_description = 
'Evaluate time investment in resolving opt-out situations. Target: 45-90 seconds per resolution. Assess: Balance between supporting struggling students and maintaining lesson pacing, efficient use of support strategies, evidence that teacher values both individual success and group progress.'
WHERE template_id = 11 AND criteria_name = 'No Opt Out - Time Investment';

UPDATE template_criteria SET criteria_description = 
'Look for instances where teacher pushes for more precise, complete, or accurate answers rather than accepting "close enough" responses. Target: 70%+ of imprecise answers receive precision requests. Evidence: "Not quite," "Can you be more specific?" "Use the exact terminology," maintaining high academic standards consistently.'
WHERE template_id = 11 AND criteria_name = 'Right is Right - Precision Requests';

UPDATE template_criteria SET criteria_description = 
'Evaluate whether high accuracy standards are maintained throughout the entire lesson without fatigue or compromise. Look for: Consistent expectations from start to finish, no lowering of standards as lesson progresses, sustained commitment to excellence despite time pressure or student resistance.'
WHERE template_id = 11 AND criteria_name = 'Right is Right - Standard Consistency';

UPDATE template_criteria SET criteria_description = 
'Identify evidence that students internalize high expectations and begin self-correcting by lesson end. Look for: Students catching their own mistakes, increasing precision in language without prompting, evidence that students understand and adopt the teacher\'s high standards.'
WHERE template_id = 11 AND criteria_name = 'Right is Right - Student Growth Evidence';

UPDATE template_criteria SET criteria_description = 
'Count instances where partially correct answers are accepted without pushback for greater precision. These represent missed opportunities to reinforce high standards. Look for: Times when teacher could have pushed for more accuracy, moments when "good enough" was accepted instead of excellence.'
WHERE template_id = 11 AND criteria_name = 'Right is Right - Missed Opportunities';

UPDATE template_criteria SET criteria_description = 
'Analyze student responses for complete sentence structure. Target: 80%+ of responses in proper format. Count responses like "Yeah" or "Because..." vs complete sentences. Look for: Teacher requests for complete sentences, evidence that students understand academic language expectations, improvement in student language quality.'
WHERE template_id = 11 AND criteria_name = 'Format Matters - Complete Sentences';

UPDATE template_criteria SET criteria_description = 
'Track usage of subject-specific academic vocabulary by students. Target: 5+ academic terms per 10-minute segment. Identify: Subject-specific terminology, elevated language choices, evidence that students are developing scholarly discourse patterns appropriate to the discipline.'
WHERE template_id = 11 AND criteria_name = 'Format Matters - Academic Vocabulary';

UPDATE template_criteria SET criteria_description = 
'Count teacher interventions requesting better language format. Look for phrases like: "Can you say that in a complete sentence?" "Use our academic vocabulary," "Try that again with precise language." Evidence of commitment to elevating student communication standards.'
WHERE template_id = 11 AND criteria_name = 'Format Matters - Format Interventions';

UPDATE template_criteria SET criteria_description = 
'Compare language quality from lesson start to end. Target: 15% improvement in format quality. Look for: Students adapting to higher expectations during lesson, evidence of responsive teaching as language standards are reinforced, progression toward academic discourse.'
WHERE template_id = 11 AND criteria_name = 'Format Matters - Language Progression';

-- Complete Framework Template (ID 10) - All Techniques
-- Update Tier 1 techniques for Complete Framework (adjusted weights)
UPDATE template_criteria SET criteria_description = 
'Analyze the transcript for Cold Call frequency. Look for instances where the teacher calls on students by name without them raising their hands. Count total cold calls and evaluate if they meet the target of 8-12 per 45-minute lesson. Consider: How many times does the teacher use unexpected questioning? Are students consistently prepared to respond? Provide specific examples with approximate timestamps if available.'
WHERE template_id = 10 AND criteria_name = 'Cold Call - Frequency';

UPDATE template_criteria SET criteria_description = 
'Examine how Cold Call questions are distributed among students. Identify different student voices/names called upon and calculate what percentage of the class participated. Target: 60%+ of students called at least once. Look for evidence of: Equitable participation, avoidance of calling only on eager volunteers, systematic inclusion of all learners.'
WHERE template_id = 10 AND criteria_name = 'Cold Call - Distribution';

UPDATE template_criteria SET criteria_description = 
'Evaluate the timing pattern of Cold Calls throughout the lesson. Are they spread evenly or clustered in certain sections? Look for: Cold calls in opening, middle, and closing of lesson. Consistent engagement expectations maintained throughout. Evidence that teacher uses Cold Call as ongoing engagement strategy, not just occasionally.'
WHERE template_id = 10 AND criteria_name = 'Cold Call - Timing';

UPDATE template_criteria SET criteria_description = 
'Assess student response quality and success rate to Cold Calls. Target: 90%+ receive substantive answers. Analyze: How often students provide meaningful responses when called unexpectedly. Evidence of a culture where students are prepared to participate. Student confidence and engagement when called upon without warning.'
WHERE template_id = 10 AND criteria_name = 'Cold Call - Effectiveness';

UPDATE template_criteria SET criteria_description = 
'Measure the pause duration between teacher questions and calling on students or accepting responses. Target: 3-5 seconds average. Count instances of adequate wait time (3+ seconds) vs rushed questions (<2 seconds). Look for evidence that teacher allows sufficient processing time for thoughtful responses.'
WHERE template_id = 10 AND criteria_name = 'Wait Time - Average Duration';

UPDATE template_criteria SET criteria_description = 
'Analyze consistency of wait time across different questions. Target: 80%+ of questions receive minimum 3-second wait time. Look for: Sustained commitment to thinking time, avoiding the tendency to fill silence quickly, evidence that teacher values student thinking over rapid responses.'
WHERE template_id = 10 AND criteria_name = 'Wait Time - Consistency';

UPDATE template_criteria SET criteria_description = 
'Evaluate whether wait time is appropriately adjusted based on question complexity. Complex questions should receive longer wait times (5-8 seconds). Look for: Strategic thinking about questioning depth, appropriate patience for higher-order thinking questions, differentiated wait time based on cognitive demand.'
WHERE template_id = 10 AND criteria_name = 'Wait Time - Question Complexity Matching';

UPDATE template_criteria SET criteria_description = 
'Identify instances where students say "I don\'t know" or give incorrect answers, then track teacher follow-through. Target: 95%+ resolution rate. Look for: Teacher persistence in helping students reach correct answers, use of scaffolding or hints, returning to original student after getting help from others, maintaining high expectations for all learners.'
WHERE template_id = 10 AND criteria_name = 'No Opt Out - Resolution Rate';

UPDATE template_criteria SET criteria_description = 
'Analyze the variety of support strategies used when students opt out. Target: 3+ different approaches (hints, simpler questions, peer help, think-pair-share, etc.). Look for: Adaptive teaching skills, creative problem-solving, differentiated support methods, teacher flexibility in helping struggling students succeed.'
WHERE template_id = 10 AND criteria_name = 'No Opt Out - Method Variety';

UPDATE template_criteria SET criteria_description = 
'Track whether teacher returns to original student with correct answer after getting help from others. This ensures the struggling student ultimately achieves success rather than avoidance. Look for: Complete follow-through on No Opt Out, student confidence building, accountability maintained for original student.'
WHERE template_id = 10 AND criteria_name = 'No Opt Out - Follow Through';

UPDATE template_criteria SET criteria_description = 
'Look for instances where teacher pushes for more precise, complete, or accurate answers rather than accepting "close enough" responses. Target: 70%+ of imprecise answers receive precision requests. Evidence: "Not quite," "Can you be more specific?" "Use the exact terminology," maintaining high academic standards consistently.'
WHERE template_id = 10 AND criteria_name = 'Right is Right - Precision Requests';

UPDATE template_criteria SET criteria_description = 
'Evaluate whether high accuracy standards are maintained throughout the entire lesson without fatigue or compromise. Look for: Consistent expectations from start to finish, no lowering of standards as lesson progresses, sustained commitment to excellence despite time pressure or student resistance.'
WHERE template_id = 10 AND criteria_name = 'Right is Right - Standard Consistency';

UPDATE template_criteria SET criteria_description = 
'Identify evidence that students internalize high expectations and begin self-correcting by lesson end. Look for: Students catching their own mistakes, increasing precision in language without prompting, evidence that students understand and adopt the teacher\'s high standards.'
WHERE template_id = 10 AND criteria_name = 'Right is Right - Student Growth Evidence';

UPDATE template_criteria SET criteria_description = 
'Analyze student responses for complete sentence structure. Target: 80%+ of responses in proper format. Count responses like "Yeah" or "Because..." vs complete sentences. Look for: Teacher requests for complete sentences, evidence that students understand academic language expectations, improvement in student language quality.'
WHERE template_id = 10 AND criteria_name = 'Format Matters - Complete Sentences';

UPDATE template_criteria SET criteria_description = 
'Track usage of subject-specific academic vocabulary by students. Target: 5+ academic terms per 10-minute segment. Identify: Subject-specific terminology, elevated language choices, evidence that students are developing scholarly discourse patterns appropriate to the discipline.'
WHERE template_id = 10 AND criteria_name = 'Format Matters - Academic Vocabulary';

UPDATE template_criteria SET criteria_description = 
'Count teacher interventions requesting better language format. Look for phrases like: "Can you say that in a complete sentence?" "Use our academic vocabulary," "Try that again with precise language." Evidence of commitment to elevating student communication standards.'
WHERE template_id = 10 AND criteria_name = 'Format Matters - Format Interventions';

-- Tier 2 Advanced Techniques for Complete Framework
UPDATE template_criteria SET criteria_description = 
'Identify follow-up questions after correct student answers. Target: 50%+ of correct answers receive extension questions. Look for: "Why do you think that?" "How do you know?" "What makes you certain?" "Can you give another example?" Evidence that teacher builds on student success to deepen thinking rather than simply accepting correct responses.'
WHERE template_id = 10 AND criteria_name = 'Stretch It - Follow-up Frequency';

UPDATE template_criteria SET criteria_description = 
'Evaluate the intellectual depth of extension questions. Analyze: Surface vs deep thinking prompts, questions that require analysis/synthesis/evaluation, connections to broader concepts, questions that challenge students to explain their reasoning and demonstrate deeper understanding.'
WHERE template_id = 10 AND criteria_name = 'Stretch It - Question Depth';

UPDATE template_criteria SET criteria_description = 
'Assess quality of student responses to stretch questions. Target: Average 2+ sentences in extended responses. Look for: Evidence of deeper thinking activation, sophisticated reasoning, student willingness to engage with challenging follow-ups, improvement in response quality when pushed to extend thinking.'
WHERE template_id = 10 AND criteria_name = 'Stretch It - Student Engagement';

UPDATE template_criteria SET criteria_description = 
'Count instances where correct answers were accepted without intellectual extension. These represent missed opportunities for deeper learning. Look for: Times when teacher could have pushed thinking further, moments when students showed readiness for intellectual challenge that wasn\'t pursued.'
WHERE template_id = 10 AND criteria_name = 'Stretch It - Missed Opportunities';

UPDATE template_criteria SET criteria_description = 
'Count comprehension checks during new content delivery. Target: Understanding check every 5-7 minutes of new material. Look for: "Who can explain this in their own words?" Quick polls, finger votes, turn-and-talk, strategic questioning to sample student understanding before proceeding with instruction.'
WHERE template_id = 10 AND criteria_name = 'CFU - Check Frequency';

UPDATE template_criteria SET criteria_description = 
'Analyze how many students are assessed during each understanding check. Target: 30%+ of students checked per concept. Look for: Representative sampling across ability levels, avoiding only calling on eager volunteers, systematic assessment of classroom comprehension, evidence of widespread understanding before moving forward.'
WHERE template_id = 10 AND criteria_name = 'CFU - Student Sampling';

UPDATE template_criteria SET criteria_description = 
'Evaluate the depth and quality of understanding demonstrated in checks. Analyze: Student ability to explain concepts in their own words, evidence of true comprehension vs surface-level repetition, quality of student explanations and reasoning, indications of conceptual mastery.'
WHERE template_id = 10 AND criteria_name = 'CFU - Response Quality';

UPDATE template_criteria SET criteria_description = 
'Look for evidence that teacher modifies instruction based on understanding check results. Evidence: Re-teaching when comprehension is low, adjusting pace based on student readiness, providing additional examples or clarification, responsive teaching that adapts to student needs in real-time.'
WHERE template_id = 10 AND criteria_name = 'CFU - Teaching Adjustments';

UPDATE template_criteria SET criteria_description = 
'Analyze the ratio of positive to corrective language. Target: 4:1 positive to corrective ratio. Count: Affirmations, encouragement, celebration of effort vs corrections, redirections, criticism. Look for language that builds students up while maintaining high expectations and providing constructive feedback.'
WHERE template_id = 10 AND criteria_name = 'Positive Framing - Language Ratio';

UPDATE template_criteria SET criteria_description = 
'Examine corrections and feedback for solution-focused language. Target: 90%+ include specific next steps. Look for: "Try this instead..." "Next time, remember to..." "Here\'s how to improve..." Corrections that tell students what TO do rather than just what NOT to do, maintaining student dignity while improving performance.'
WHERE template_id = 10 AND criteria_name = 'Positive Framing - Solution Focus';

UPDATE template_criteria SET criteria_description = 
'Count instances of effort and achievement recognition. Target: 3+ affirmations per student per lesson. Look for: Specific praise for improvement, acknowledgment of good thinking processes, celebration of academic risk-taking, recognition that builds intrinsic motivation and confidence.'
WHERE template_id = 10 AND criteria_name = 'Positive Framing - Recognition Frequency';

UPDATE template_criteria SET criteria_description = 
'Evaluate maintenance of positive, solution-focused tone throughout the lesson. Look for: Consistent encouragement during challenging moments, positive energy maintained during corrections, emotional regulation during difficult student behaviors, professional demeanor that supports learning environment.'
WHERE template_id = 10 AND criteria_name = 'Positive Framing - Tone Consistency';

UPDATE template_criteria SET criteria_description = 
'Analyze teacher directions and corrections for conciseness. Target: 15 words or fewer for routine directions. Count: Word economy in management moments, clear and direct communication, avoidance of over-explaining or unnecessary elaboration, authoritative communication that maintains lesson flow.'
WHERE template_id = 10 AND criteria_name = 'Strong Voice - Economy of Language';

UPDATE template_criteria SET criteria_description = 
'Count instances where instructions require repetition or clarification. Target: <10% need repetition. Look for: Clear first-time communication, student understanding of directions, evidence that teacher\'s instructions are precise and unambiguous, efficient communication that prevents confusion.'
WHERE template_id = 10 AND criteria_name = 'Strong Voice - Clarity Index';

UPDATE template_criteria SET criteria_description = 
'Evaluate consistency of voice tone and authority during management moments. Look for: Calm confidence during disruptions, maintained authority without harshness, consistent expectations communicated through tone, professional presence that commands respect and attention.'
WHERE template_id = 10 AND criteria_name = 'Strong Voice - Tone Consistency';

UPDATE template_criteria SET criteria_description = 
'Assess how well instructional time is preserved during management. Target: 90%+ instructional time maintained. Look for: Efficient handling of disruptions, quick resolution of management issues, balance between maintaining authority and staying focused on learning, minimal time lost to behavioral management.'
WHERE template_id = 10 AND criteria_name = 'Strong Voice - Management Efficiency';

UPDATE template_criteria SET criteria_description = 
'Verify that clear learning objective is stated within first 3 minutes of lesson. Look for: Specific, measurable learning goal communicated to students, student-friendly language explaining what they will learn, clear connection between objective and lesson activities, evidence that students understand the learning target.'
WHERE template_id = 10 AND criteria_name = 'Begin with End - Objective Clarity';

UPDATE template_criteria SET criteria_description = 
'Look for evidence that students understand the learning target. Evidence: Student questions about the objective, student references to the goal during lesson, ability to explain what they\'re supposed to learn, engagement with success criteria, understanding of lesson purpose and expectations.'
WHERE template_id = 10 AND criteria_name = 'Begin with End - Student Understanding';

UPDATE template_criteria SET criteria_description = 
'Evaluate connection between activities and stated objective. Target: 2+ explicit references throughout lesson. Look for: "Remember, we\'re learning to..." "This helps us with our goal of..." Clear alignment between instruction and learning target, coherent lesson structure focused on the objective.'
WHERE template_id = 10 AND criteria_name = 'Begin with End - Lesson Alignment';

UPDATE template_criteria SET criteria_description = 
'Check for explicit return to learning goal at lesson end. Look for: Closure that connects back to objective, assessment of whether goal was achieved, reflection on learning progress, clear connection between lesson activities and stated learning outcome, evidence of objective accomplishment.'
WHERE template_id = 10 AND criteria_name = 'Begin with End - Closure Connection';