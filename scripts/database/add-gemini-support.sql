-- Add Gemini support to the prompt system
-- Step 1: Update the provider enum to include 'gemini'

-- Update prompts table provider enum
ALTER TABLE prompts
MODIFY COLUMN provider ENUM('lemur','openai','gemini') NOT NULL;

-- Update prompt_history table provider enum
ALTER TABLE prompt_history
MODIFY COLUMN provider ENUM('lemur','openai','gemini') NOT NULL;

-- Step 2: Add gemini_prompt_id column to templates table
ALTER TABLE templates
ADD COLUMN gemini_prompt_id INT DEFAULT NULL
AFTER openai_prompt_id;

-- Step 3: Add foreign key constraint for gemini_prompt_id (optional)
-- ALTER TABLE templates
-- ADD CONSTRAINT fk_templates_gemini_prompt
-- FOREIGN KEY (gemini_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;

-- Step 4: Update stored procedures to support gemini provider
-- (We'll need to recreate them since they have the enum validation)

DROP PROCEDURE IF EXISTS create_prompt_version;
DROP PROCEDURE IF EXISTS revert_to_prompt_version;

DELIMITER $$

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

  -- Validate provider
  IF p_provider NOT IN ('lemur', 'openai', 'gemini') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid provider. Must be lemur, openai, or gemini';
  END IF;

  -- Get current max version for this provider/name combination
  SELECT COALESCE(MAX(version), 0) INTO current_version
  FROM prompts
  WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci;

  -- Deactivate all previous versions
  UPDATE prompts
  SET is_active = FALSE
  WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci;

  -- Insert new version
  INSERT INTO prompts (provider, name, description, prompt_template, version, is_active, created_by)
  VALUES (p_provider, p_name, p_description, p_prompt_template, current_version + 1, TRUE, p_created_by);

  SET new_prompt_id = LAST_INSERT_ID();

  -- Record in history
  INSERT INTO prompt_history (prompt_id, provider, name, prompt_template, version, change_description, changed_by)
  VALUES (new_prompt_id, p_provider, p_name, p_prompt_template, current_version + 1, p_change_description, p_created_by);

  SELECT new_prompt_id as id, current_version + 1 as version;
END$$

CREATE PROCEDURE `revert_to_prompt_version`(
  IN p_provider VARCHAR(20),
  IN p_name VARCHAR(100),
  IN p_version INT,
  IN p_reverted_by VARCHAR(255)
)
BEGIN
  DECLARE prompt_template_content LONGTEXT;
  DECLARE prompt_exists INT DEFAULT 0;

  -- Validate provider
  IF p_provider NOT IN ('lemur', 'openai', 'gemini') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid provider. Must be lemur, openai, or gemini';
  END IF;

  -- Check if the specified version exists
  SELECT COUNT(*), prompt_template INTO prompt_exists, prompt_template_content
  FROM prompts
  WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
    AND version = p_version
  GROUP BY prompt_template;

  IF prompt_exists > 0 THEN
    -- Deactivate all versions
    UPDATE prompts
    SET is_active = FALSE
    WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci;

    -- Activate the specified version
    UPDATE prompts
    SET is_active = TRUE
    WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND version = p_version;

    -- Record the reversion in history
    INSERT INTO prompt_history (
      prompt_id, provider, name, prompt_template, version,
      change_description, changed_by
    )
    SELECT
      id, provider, name, prompt_template, version,
      CONCAT('Reverted to version ', p_version), p_reverted_by
    FROM prompts
    WHERE provider = CONVERT(p_provider USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND name = CONVERT(p_name USING utf8mb4) COLLATE utf8mb4_unicode_ci
      AND version = p_version;

    SELECT 'Success' as status, p_version as active_version;
  ELSE
    SELECT 'Error' as status, 'Version not found' as message;
  END IF;
END$$

DELIMITER ;