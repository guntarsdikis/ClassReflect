-- Add OpenRouter support to database schema
-- Run this after switching to OpenRouter provider

-- 1. Add openrouter_prompt_id column to templates table
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS openrouter_prompt_id INT NULL AFTER gemini_prompt_id,
ADD CONSTRAINT fk_templates_openrouter_prompt
  FOREIGN KEY (openrouter_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;

-- 2. Update provider ENUM to include 'openrouter' and 'vertex'
ALTER TABLE prompts
MODIFY COLUMN provider ENUM('lemur', 'openai', 'gemini', 'vertex', 'openrouter') NOT NULL;

-- 3. Create default OpenRouter prompt (copy from Gemini)
-- Only insert if it doesn't already exist
INSERT INTO prompts (provider, name, description, prompt_template, version, is_active, created_by, created_at)
SELECT
  'openrouter' as provider,
  'analysis_prompt' as name,
  'OpenRouter version - Dynamic evaluation template for classroom analysis' as description,
  prompt_template,
  1 as version,
  TRUE as is_active,
  'system' as created_by,
  NOW() as created_at
FROM prompts
WHERE provider = 'gemini'
  AND name = 'analysis_prompt'
  AND is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM prompts WHERE provider = 'openrouter' AND name = 'analysis_prompt'
  )
LIMIT 1;

-- 4. Verify setup
SELECT
  'Templates table check' as step,
  COUNT(*) as openrouter_column_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'classreflect'
  AND TABLE_NAME = 'templates'
  AND COLUMN_NAME = 'openrouter_prompt_id';

SELECT
  'Prompts table check' as step,
  id,
  provider,
  name,
  version,
  is_active
FROM prompts
WHERE provider = 'openrouter'
ORDER BY version DESC;