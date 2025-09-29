-- Fix missing columns in templates table
-- Add lemur_prompt_id and openai_prompt_id columns to production

-- Add lemur_prompt_id column
ALTER TABLE templates
ADD COLUMN lemur_prompt_id INT DEFAULT NULL
AFTER updated_at;

-- Add openai_prompt_id column
ALTER TABLE templates
ADD COLUMN openai_prompt_id INT DEFAULT NULL
AFTER lemur_prompt_id;

-- Add foreign key constraints if needed (optional)
-- Note: Uncomment these if the prompts table has the right structure
-- ALTER TABLE templates
-- ADD CONSTRAINT fk_templates_lemur_prompt
-- FOREIGN KEY (lemur_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;

-- ALTER TABLE templates
-- ADD CONSTRAINT fk_templates_openai_prompt
-- FOREIGN KEY (openai_prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;