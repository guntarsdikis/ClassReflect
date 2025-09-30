import pool from '../database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Prompt {
  id: number;
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter' | 'vertex' | 'openrouter';
  name: string;
  description?: string;
  prompt_template: string;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  metadata?: any;
}

export interface PromptHistory {
  id: number;
  prompt_id: number;
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter' | 'vertex' | 'openrouter';
  name: string;
  prompt_template: string;
  version: number;
  change_description?: string;
  changed_by: string;
  changed_at: Date;
  metadata?: any;
}

export interface PromptTestResult {
  id: number;
  prompt_id: number;
  test_input: string;
  test_output: string;
  score?: number;
  feedback?: string;
  tested_by: string;
  tested_at: Date;
}

export interface PromptVariables {
  CONTEXT_CALIBRATION?: string;
  CLASS_CONTEXT?: string;
  WAIT_TIME_METRICS?: string;
  TIMING_SECTION?: string;
  EVALUATION_TEMPLATE?: string;
  CRITERIA_ANALYSIS?: string;
  OUTPUT_REQUIREMENTS?: string;
  SCORING_RUBRIC?: string;
  TARGET_ADJUSTMENT?: string;
  CRITERIA_TO_ANALYZE?: string;
  RULES_FOR_EVIDENCE?: string;
  BALANCE_REQUIREMENT?: string;
  IMPORTANT_NOTES?: string;
  OUTPUT_REQUIREMENT?: string;
  [key: string]: string | undefined;
}

export class PromptManager {
  /**
   * Get template-specific prompt or fallback to active default
   */
  async getTemplatePrompt(templateId: number, provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter' | 'vertex' | 'openrouter'): Promise<Prompt | null> {
    try {
      // First check if template has a specific prompt assigned
      const [templateRows] = await pool.query<RowDataPacket[]>(
        `SELECT ${provider}_prompt_id as prompt_id FROM templates WHERE id = ?`,
        [templateId]
      );

      if (templateRows.length > 0 && templateRows[0].prompt_id) {
        const [promptRows] = await pool.query<RowDataPacket[]>(
          `SELECT * FROM prompts WHERE id = ?`,
          [templateRows[0].prompt_id]
        );

        if (promptRows.length > 0) {
          return promptRows[0] as Prompt;
        }
      }

      // No template-specific prompt, return null (caller should fallback to getActivePrompt)
      return null;
    } catch (error) {
      console.error('Error fetching template prompt:', error);
      return null;
    }
  }

  /**
   * Get the active prompt for a provider and name
   */
  async getActivePrompt(provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter' | 'vertex' | 'openrouter', name: string): Promise<Prompt | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompts
         WHERE provider = ? AND name = ? AND is_active = TRUE
         LIMIT 1`,
        [provider, name]
      );

      if (rows.length === 0) {
        console.log(`No active prompt found for ${provider}/${name}, using defaults`);
        return null;
      }

      return rows[0] as Prompt;
    } catch (error) {
      console.error('Error fetching active prompt:', error);
      return null;
    }
  }

  /**
   * Get a specific version of a prompt
   */
  async getPromptVersion(provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter', name: string, version: number): Promise<Prompt | null> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompts
         WHERE provider = ? AND name = ? AND version = ?
         LIMIT 1`,
        [provider, name, version]
      );

      return rows.length > 0 ? rows[0] as Prompt : null;
    } catch (error) {
      console.error('Error fetching prompt version:', error);
      return null;
    }
  }

  /**
   * Get all versions of a prompt
   */
  async getPromptVersions(provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter', name: string): Promise<Prompt[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompts
         WHERE provider = ? AND name = ?
         ORDER BY version DESC`,
        [provider, name]
      );

      return rows as Prompt[];
    } catch (error) {
      console.error('Error fetching prompt versions:', error);
      return [];
    }
  }

  /**
   * Get all prompts for a provider
   */
  async getProviderPrompts(provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter'): Promise<Prompt[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompts
         WHERE provider = ?
         ORDER BY name, version DESC`,
        [provider]
      );

      return rows as Prompt[];
    } catch (error) {
      console.error('Error fetching provider prompts:', error);
      return [];
    }
  }

  /**
   * Create a new version of a prompt
   */
  async createPromptVersion(
    provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter',
    name: string,
    promptTemplate: string,
    description: string,
    changeDescription: string,
    createdBy: string
  ): Promise<{ id: number; version: number } | null> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `CALL create_prompt_version(?, ?, ?, ?, ?, ?)`,
        [provider, name, promptTemplate, description, changeDescription, createdBy]
      );

      const resultData = (result as any)[0][0];
      return {
        id: resultData.id,
        version: resultData.version
      };
    } catch (error) {
      console.error('Error creating prompt version:', error);
      return null;
    }
  }

  /**
   * Revert to a previous version
   */
  async revertToVersion(
    provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter',
    name: string,
    version: number,
    revertedBy: string
  ): Promise<boolean> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `CALL revert_to_prompt_version(?, ?, ?, ?)`,
        [provider, name, version, revertedBy]
      );

      const resultData = (result as any)[0][0];
      return resultData.status === 'Success';
    } catch (error) {
      console.error('Error reverting to prompt version:', error);
      return false;
    }
  }

  /**
   * Get prompt history
   */
  async getPromptHistory(promptId: number): Promise<PromptHistory[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompt_history
         WHERE prompt_id = ?
         ORDER BY changed_at DESC`,
        [promptId]
      );

      return rows as PromptHistory[];
    } catch (error) {
      console.error('Error fetching prompt history:', error);
      return [];
    }
  }

  /**
   * Save test result for a prompt
   */
  async saveTestResult(
    promptId: number,
    testInput: string,
    testOutput: string,
    score: number | null,
    feedback: string | null,
    testedBy: string
  ): Promise<number | null> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO prompt_test_results
         (prompt_id, test_input, test_output, score, feedback, tested_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [promptId, testInput, testOutput, score, feedback, testedBy]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error saving test result:', error);
      return null;
    }
  }

  /**
   * Get test results for a prompt
   */
  async getTestResults(promptId: number): Promise<PromptTestResult[]> {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM prompt_test_results
         WHERE prompt_id = ?
         ORDER BY tested_at DESC`,
        [promptId]
      );

      return rows as PromptTestResult[];
    } catch (error) {
      console.error('Error fetching test results:', error);
      return [];
    }
  }

  /**
   * Replace template variables in a prompt
   */
  replaceTemplateVariables(promptTemplate: string, variables: PromptVariables): string {
    let result = promptTemplate;

    // Replace each variable in the template
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
      }
    });

    // Remove any remaining placeholders that weren't replaced
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  }

  /**
   * Compare two prompts and get differences
   */
  comparePrompts(prompt1: string, prompt2: string): {
    additions: string[];
    deletions: string[];
    changes: number;
  } {
    const lines1 = prompt1.split('\n');
    const lines2 = prompt2.split('\n');

    const additions: string[] = [];
    const deletions: string[] = [];
    let changes = 0;

    // Simple line-by-line comparison
    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      if (i >= lines1.length) {
        additions.push(lines2[i]);
        changes++;
      } else if (i >= lines2.length) {
        deletions.push(lines1[i]);
        changes++;
      } else if (lines1[i] !== lines2[i]) {
        deletions.push(lines1[i]);
        additions.push(lines2[i]);
        changes++;
      }
    }

    return { additions, deletions, changes };
  }

  /**
   * Validate prompt template
   */
  validatePromptTemplate(promptTemplate: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for minimum length
    if (promptTemplate.length < 100) {
      issues.push('Prompt template is too short (minimum 100 characters)');
    }

    // Check for maximum length
    if (promptTemplate.length > 50000) {
      issues.push('Prompt template is too long (maximum 50,000 characters)');
    }

    // Check for unclosed template variables
    const openBraces = (promptTemplate.match(/{{/g) || []).length;
    const closeBraces = (promptTemplate.match(/}}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('Unclosed template variables detected');
    }

    // Check for required sections in analysis prompts
    const requiredSections = [
      'PRIMARY GOAL',
      'STYLE',
      'SCORING RUBRIC'
    ];

    requiredSections.forEach(section => {
      if (!promptTemplate.includes(section)) {
        issues.push(`Missing required section: ${section}`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get prompt statistics
   */
  async getPromptStats(): Promise<{
    totalPrompts: number;
    activePrompts: number;
    totalVersions: number;
    totalTests: number;
    providerCounts: Record<string, number>;
  }> {
    try {
      const [totalResult] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM prompts'
      );

      const [activeResult] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as active FROM prompts WHERE is_active = TRUE'
      );

      const [versionResult] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(DISTINCT CONCAT(provider, name)) as versions FROM prompts'
      );

      const [testResult] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as tests FROM prompt_test_results'
      );

      const [providerResult] = await pool.query<RowDataPacket[]>(
        'SELECT provider, COUNT(*) as count FROM prompts GROUP BY provider'
      );

      const providerCounts: Record<string, number> = {};
      providerResult.forEach((row: any) => {
        providerCounts[row.provider] = row.count;
      });

      return {
        totalPrompts: totalResult[0].total,
        activePrompts: activeResult[0].active,
        totalVersions: versionResult[0].versions,
        totalTests: testResult[0].tests,
        providerCounts
      };
    } catch (error) {
      console.error('Error fetching prompt stats:', error);
      return {
        totalPrompts: 0,
        activePrompts: 0,
        totalVersions: 0,
        totalTests: 0,
        providerCounts: {}
      };
    }
  }

  /**
   * Export prompts to JSON for backup
   */
  async exportPrompts(provider?: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter'): Promise<string> {
    try {
      let query = 'SELECT * FROM prompts';
      const params: any[] = [];

      if (provider) {
        query += ' WHERE provider = ?';
        params.push(provider);
      }

      const [prompts] = await pool.query<RowDataPacket[]>(query, params);

      const exportData = {
        exportDate: new Date().toISOString(),
        provider: provider || 'all',
        prompts: prompts,
        version: '1.0'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting prompts:', error);
      throw error;
    }
  }

  /**
   * Import prompts from JSON
   */
  async importPrompts(jsonData: string, importedBy: string): Promise<{
    success: boolean;
    imported: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(jsonData);

      if (!data.prompts || !Array.isArray(data.prompts)) {
        errors.push('Invalid import data: missing prompts array');
        return { success: false, imported: 0, errors };
      }

      for (const prompt of data.prompts) {
        try {
          const result = await this.createPromptVersion(
            prompt.provider,
            prompt.name,
            prompt.prompt_template,
            prompt.description || '',
            `Imported from backup (${data.exportDate})`,
            importedBy
          );

          if (result) {
            imported++;
          } else {
            errors.push(`Failed to import prompt: ${prompt.provider}/${prompt.name}`);
          }
        } catch (error) {
          errors.push(`Error importing ${prompt.provider}/${prompt.name}: ${error}`);
        }
      }

      return {
        success: imported > 0,
        imported,
        errors
      };
    } catch (error) {
      errors.push(`JSON parse error: ${error}`);
      return { success: false, imported: 0, errors };
    }
  }
}

export const promptManager = new PromptManager();