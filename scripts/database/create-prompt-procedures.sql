-- Create missing stored procedures for prompt management

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

  -- Get current max version for this provider/name combination
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

  -- Record in history
  INSERT INTO prompt_history (prompt_id, provider, name, prompt_template, version, change_description, changed_by)
  VALUES (new_prompt_id, p_provider, p_name, p_prompt_template, current_version + 1, p_change_description, p_created_by);

  SELECT new_prompt_id as id, current_version + 1 as version;
END$$

DELIMITER $$

CREATE PROCEDURE `revert_to_prompt_version`(
  IN p_provider VARCHAR(20),
  IN p_name VARCHAR(100),
  IN p_version INT,
  IN p_reverted_by VARCHAR(255)
)
BEGIN
  DECLARE prompt_template_content LONGTEXT;
  DECLARE prompt_exists INT DEFAULT 0;

  -- Check if the specified version exists
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

    -- Record the reversion in history
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
END$$

DELIMITER ;