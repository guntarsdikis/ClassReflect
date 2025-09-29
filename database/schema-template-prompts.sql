-- Template-specific prompt version assignments
-- This allows each template to specify which prompt version to use for each provider

-- Add columns to analysis_templates table for prompt version assignments
ALTER TABLE `analysis_templates`
ADD COLUMN `lemur_prompt_id` INT DEFAULT NULL AFTER `status`,
ADD COLUMN `openai_prompt_id` INT DEFAULT NULL AFTER `lemur_prompt_id`,
ADD FOREIGN KEY (`lemur_prompt_id`) REFERENCES `prompts`(`id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`openai_prompt_id`) REFERENCES `prompts`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_template_prompts` (`lemur_prompt_id`, `openai_prompt_id`);

-- Add comment to explain the columns
ALTER TABLE `analysis_templates`
MODIFY COLUMN `lemur_prompt_id` INT DEFAULT NULL COMMENT 'Specific LemUR/Claude prompt version to use for this template',
MODIFY COLUMN `openai_prompt_id` INT DEFAULT NULL COMMENT 'Specific OpenAI prompt version to use for this template';

-- Create a view to easily see template prompt assignments
CREATE OR REPLACE VIEW `template_prompt_assignments` AS
SELECT
  t.id AS template_id,
  t.name AS template_name,
  t.description AS template_description,
  t.school_id,
  s.name AS school_name,
  lp.id AS lemur_prompt_id,
  lp.version AS lemur_prompt_version,
  lp.is_active AS lemur_prompt_active,
  lp.description AS lemur_prompt_description,
  op.id AS openai_prompt_id,
  op.version AS openai_prompt_version,
  op.is_active AS openai_prompt_active,
  op.description AS openai_prompt_description
FROM analysis_templates t
LEFT JOIN schools s ON t.school_id = s.id
LEFT JOIN prompts lp ON t.lemur_prompt_id = lp.id
LEFT JOIN prompts op ON t.openai_prompt_id = op.id;

-- Stored procedure to assign prompt versions to a template
DELIMITER //

CREATE PROCEDURE `assign_template_prompts`(
  IN p_template_id INT,
  IN p_lemur_prompt_id INT,
  IN p_openai_prompt_id INT
)
BEGIN
  -- Validate template exists
  IF NOT EXISTS (SELECT 1 FROM analysis_templates WHERE id = p_template_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Template not found';
  END IF;

  -- Validate lemur prompt if provided
  IF p_lemur_prompt_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM prompts WHERE id = p_lemur_prompt_id AND provider = 'lemur') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid LemUR prompt ID';
  END IF;

  -- Validate openai prompt if provided
  IF p_openai_prompt_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM prompts WHERE id = p_openai_prompt_id AND provider = 'openai') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid OpenAI prompt ID';
  END IF;

  -- Update the template
  UPDATE analysis_templates
  SET
    lemur_prompt_id = p_lemur_prompt_id,
    openai_prompt_id = p_openai_prompt_id,
    updated_at = NOW()
  WHERE id = p_template_id;

  SELECT 'Success' as status, p_template_id as template_id;
END//

-- Stored procedure to copy prompt assignments from one template to another
CREATE PROCEDURE `copy_template_prompt_assignments`(
  IN p_source_template_id INT,
  IN p_target_template_id INT
)
BEGIN
  DECLARE source_lemur_id INT;
  DECLARE source_openai_id INT;

  -- Get source template prompt assignments
  SELECT lemur_prompt_id, openai_prompt_id
  INTO source_lemur_id, source_openai_id
  FROM analysis_templates
  WHERE id = p_source_template_id;

  -- Update target template
  UPDATE analysis_templates
  SET
    lemur_prompt_id = source_lemur_id,
    openai_prompt_id = source_openai_id,
    updated_at = NOW()
  WHERE id = p_target_template_id;

  SELECT 'Success' as status,
         source_lemur_id as lemur_prompt_id,
         source_openai_id as openai_prompt_id;
END//

-- Stored procedure to get best prompt for a template (with fallback logic)
CREATE PROCEDURE `get_template_prompt`(
  IN p_template_id INT,
  IN p_provider VARCHAR(20)
)
BEGIN
  DECLARE template_prompt_id INT;
  DECLARE active_prompt_id INT;

  -- Get template-specific prompt
  IF p_provider = 'lemur' THEN
    SELECT lemur_prompt_id INTO template_prompt_id
    FROM analysis_templates
    WHERE id = p_template_id;
  ELSE
    SELECT openai_prompt_id INTO template_prompt_id
    FROM analysis_templates
    WHERE id = p_template_id;
  END IF;

  -- If template has specific prompt, return it
  IF template_prompt_id IS NOT NULL THEN
    SELECT * FROM prompts WHERE id = template_prompt_id;
  ELSE
    -- Otherwise return the active prompt for the provider
    SELECT * FROM prompts
    WHERE provider = p_provider AND name = 'analysis_prompt' AND is_active = TRUE
    LIMIT 1;
  END IF;
END//

DELIMITER ;