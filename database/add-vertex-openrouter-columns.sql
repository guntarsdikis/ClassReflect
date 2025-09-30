-- Add vertex_prompt_id and openrouter_prompt_id columns to templates table
-- Safe to run multiple times (checks if columns exist)
-- Generated: 2025-09-30

-- Add vertex_prompt_id if missing
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND COLUMN_NAME = 'vertex_prompt_id') = 0,
    'ALTER TABLE templates ADD COLUMN vertex_prompt_id INT NULL AFTER gemini_prompt_id',
    'SELECT "Column vertex_prompt_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add openrouter_prompt_id if missing
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND COLUMN_NAME = 'openrouter_prompt_id') = 0,
    'ALTER TABLE templates ADD COLUMN openrouter_prompt_id INT NULL AFTER vertex_prompt_id',
    'SELECT "Column openrouter_prompt_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for vertex_prompt_id if not exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND CONSTRAINT_NAME = 'fk_templates_vertex_prompt') = 0,
    'ALTER TABLE templates ADD CONSTRAINT fk_templates_vertex_prompt FOREIGN KEY (vertex_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_templates_vertex_prompt already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for openrouter_prompt_id if not exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND CONSTRAINT_NAME = 'fk_templates_openrouter_prompt') = 0,
    'ALTER TABLE templates ADD CONSTRAINT fk_templates_openrouter_prompt FOREIGN KEY (openrouter_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL',
    'SELECT "Foreign key fk_templates_openrouter_prompt already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update prompts table to include vertex and openrouter providers if not present
-- This is safe because ENUM modification will only work if values don't exist
SET @current_enum = (
    SELECT COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prompts'
    AND COLUMN_NAME = 'provider'
);

-- Only update if vertex or openrouter is missing
SET @needs_update = IF(
    @current_enum LIKE '%vertex%' AND @current_enum LIKE '%openrouter%',
    0,
    1
);

SET @sql = IF(@needs_update = 1,
    "ALTER TABLE prompts MODIFY COLUMN provider ENUM('lemur', 'openai', 'gemini', 'vertex', 'openrouter') NOT NULL",
    "SELECT 'Provider enum already includes vertex and openrouter' AS message"
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on vertex_prompt_id if not exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND INDEX_NAME = 'idx_vertex_prompt_id') = 0,
    'ALTER TABLE templates ADD INDEX idx_vertex_prompt_id (vertex_prompt_id)',
    'SELECT "Index idx_vertex_prompt_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on openrouter_prompt_id if not exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'templates'
     AND INDEX_NAME = 'idx_openrouter_prompt_id') = 0,
    'ALTER TABLE templates ADD INDEX idx_openrouter_prompt_id (openrouter_prompt_id)',
    'SELECT "Index idx_openrouter_prompt_id already exists" AS message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the columns were added
SELECT
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME IN ('vertex_prompt_id', 'openrouter_prompt_id')
ORDER BY ORDINAL_POSITION;