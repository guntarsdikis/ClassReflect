-- Update stored procedure to support OpenRouter and Vertex AI providers
-- This fixes the "Invalid provider" error when creating prompt versions
-- Run on both local and production databases

-- 1. Update prompts table ENUM to include vertex and openrouter
ALTER TABLE prompts
MODIFY COLUMN provider ENUM('lemur', 'openai', 'gemini', 'vertex', 'openrouter') NOT NULL;

-- 2. Drop and recreate the stored procedure with updated validation
DELIMITER $$

DROP PROCEDURE IF EXISTS `create_prompt_version`$$

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

  -- Validate provider (now includes vertex and openrouter)
  IF p_provider NOT IN ('lemur', 'openai', 'gemini', 'vertex', 'openrouter') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid provider. Must be lemur, openai, gemini, vertex, or openrouter';
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

DELIMITER ;

-- 3. Verify the changes
SELECT
  'Provider ENUM updated' as status,
  COLUMN_TYPE as provider_values
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'prompts'
  AND COLUMN_NAME = 'provider';

SELECT 'Stored procedure updated' as status;