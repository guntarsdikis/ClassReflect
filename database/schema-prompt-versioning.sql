-- Prompt Versioning System for ClassReflect
-- This schema adds support for versioned prompts for AI providers (LemUR/Claude and OpenAI)

-- Create prompts table
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` ENUM('lemur', 'openai') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `prompt_template` LONGTEXT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `is_active` BOOLEAN DEFAULT FALSE,
  `created_by` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `metadata` JSON,
  INDEX `idx_provider_active` (`provider`, `is_active`),
  INDEX `idx_provider_name_version` (`provider`, `name`, `version`),
  UNIQUE KEY `unique_provider_name_version` (`provider`, `name`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create prompt history table for tracking changes
CREATE TABLE IF NOT EXISTS `prompt_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prompt_id` INT NOT NULL,
  `provider` ENUM('lemur', 'openai') NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `prompt_template` LONGTEXT NOT NULL,
  `version` INT NOT NULL,
  `change_description` TEXT,
  `changed_by` VARCHAR(255) NOT NULL,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `metadata` JSON,
  INDEX `idx_prompt_id` (`prompt_id`),
  INDEX `idx_changed_at` (`changed_at`),
  FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create prompt test results table
CREATE TABLE IF NOT EXISTS `prompt_test_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `prompt_id` INT NOT NULL,
  `test_input` TEXT,
  `test_output` TEXT,
  `score` DECIMAL(5,2),
  `feedback` TEXT,
  `tested_by` VARCHAR(255) NOT NULL,
  `tested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default prompts from current implementations
INSERT INTO `prompts` (`provider`, `name`, `description`, `prompt_template`, `version`, `is_active`, `created_by`)
VALUES
  ('lemur', 'analysis_prompt', 'Main analysis prompt for LemUR/Claude',
   'You are an expert instructional coach analyzing a classroom transcript using a dynamic evaluation template.

PRIMARY GOAL
- Provide constructive, motivational, evidence-based coaching feedback for the teacher.
- This report is for growth, not punishment.
- Numbers are for admin tracking; narrative must be teacher-facing and improvement-focused.

STYLE
- Coaching voice: warm, specific, encouraging; use direct address ("You did…", "Next time, consider…").
- Ground every claim in transcript evidence (quotes + timestamps).
- For each criterion''s "feedback", write 6 sentences (not fewer) and ≤120 words.
- Avoid generic advice; always include a micro-action and an exemplar script.

MOTIVATIONAL SCORING RUBRIC
- 55–65 = Baseline / Absent but improvable → Give credit, explain one easy way to add it next lesson.
- 66–75 = Emerging → Praise attempt, suggest refinement.
- 76–85 = Developing → Present but inconsistent; provide a coaching move.
- 86–92 = Strong → Consistently applied; celebrate and refine.
- 93–100 = Exemplary → Best practice; affirm and encourage sharing.

{{CONTEXT_CALIBRATION}}
{{CLASS_CONTEXT}}
{{WAIT_TIME_METRICS}}
{{TIMING_SECTION}}
{{EVALUATION_TEMPLATE}}
{{CRITERIA_ANALYSIS}}
{{OUTPUT_REQUIREMENTS}}',
   1, TRUE, 'system'),

  ('openai', 'analysis_prompt', 'Main analysis prompt for OpenAI',
   'You are an expert instructional coach analyzing a classroom transcript using a dynamic evaluation template.

PRIMARY GOAL
- Provide constructive, motivational, and evidence-based coaching feedback.
- Reports should motivate teachers, not punish them.
- Numbers are for admin tracking; narrative feedback must always be teacher-facing and improvement-focused.

STYLE
- Coaching voice: warm, specific, encouraging; use direct address ("You did…", "Next time, consider…").
- Always ground claims in transcript evidence (quotes + timestamps).
- For each criterion, write exactly 6 sentences (≥6), ≤120 words.
- Avoid vague "No evidence available" comments. Always give at least one actionable suggestion and exemplar.

{{SCORING_RUBRIC}}
{{CONTEXT_CALIBRATION}}
{{TARGET_ADJUSTMENT}}
{{CLASS_CONTEXT}}
{{EVALUATION_TEMPLATE}}
{{CRITERIA_TO_ANALYZE}}
{{RULES_FOR_EVIDENCE}}
{{BALANCE_REQUIREMENT}}
{{IMPORTANT_NOTES}}
{{WAIT_TIME_METRICS}}
{{OUTPUT_REQUIREMENT}}',
   1, TRUE, 'system');

-- Create stored procedures for version management

DELIMITER //

CREATE PROCEDURE `create_prompt_version`(
  IN p_provider VARCHAR(20),
  IN p_name VARCHAR(100),
  IN p_prompt_template LONGTEXT,
  IN p_description TEXT,
  IN p_change_description TEXT,
  IN p_created_by VARCHAR(255)
)
BEGIN
  DECLARE current_version INT DEFAULT 0;
  DECLARE new_prompt_id INT;

  -- Get the highest version for this provider/name
  SELECT COALESCE(MAX(version), 0) INTO current_version
  FROM prompts
  WHERE provider = p_provider AND name = p_name;

  -- Deactivate all previous versions
  UPDATE prompts
  SET is_active = FALSE
  WHERE provider = p_provider AND name = p_name;

  -- Insert new version
  INSERT INTO prompts (provider, name, description, prompt_template, version, is_active, created_by)
  VALUES (p_provider, p_name, p_description, p_prompt_template, current_version + 1, TRUE, p_created_by);

  SET new_prompt_id = LAST_INSERT_ID();

  -- Add to history
  INSERT INTO prompt_history (prompt_id, provider, name, prompt_template, version, change_description, changed_by)
  VALUES (new_prompt_id, p_provider, p_name, p_prompt_template, current_version + 1, p_change_description, p_created_by);

  SELECT new_prompt_id as id, current_version + 1 as version;
END//

CREATE PROCEDURE `revert_to_prompt_version`(
  IN p_provider VARCHAR(20),
  IN p_name VARCHAR(100),
  IN p_version INT,
  IN p_reverted_by VARCHAR(255)
)
BEGIN
  DECLARE prompt_template_content LONGTEXT;
  DECLARE prompt_exists INT DEFAULT 0;

  -- Check if the version exists
  SELECT COUNT(*), prompt_template INTO prompt_exists, prompt_template_content
  FROM prompts
  WHERE provider = p_provider AND name = p_name AND version = p_version
  GROUP BY prompt_template;

  IF prompt_exists > 0 THEN
    -- Deactivate all versions
    UPDATE prompts
    SET is_active = FALSE
    WHERE provider = p_provider AND name = p_name;

    -- Activate the specified version
    UPDATE prompts
    SET is_active = TRUE
    WHERE provider = p_provider AND name = p_name AND version = p_version;

    -- Add to history
    INSERT INTO prompt_history (
      prompt_id, provider, name, prompt_template, version,
      change_description, changed_by
    )
    SELECT
      id, provider, name, prompt_template, version,
      CONCAT('Reverted to version ', p_version), p_reverted_by
    FROM prompts
    WHERE provider = p_provider AND name = p_name AND version = p_version;

    SELECT 'Success' as status, p_version as active_version;
  ELSE
    SELECT 'Error' as status, 'Version not found' as message;
  END IF;
END//

DELIMITER ;