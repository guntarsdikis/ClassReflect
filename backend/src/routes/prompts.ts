import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { promptManager } from '../services/promptManager';

const router = Router();

// All prompt endpoints require authentication and super admin role
router.use(authenticate);
router.use(authorize('super_admin'));

// Get all prompts for a provider
router.get('/provider/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Must be lemur or openai' });
    }

    const prompts = await promptManager.getProviderPrompts(provider as 'lemur' | 'openai');

    res.json({
      provider,
      prompts,
      count: prompts.length
    });
  } catch (error) {
    console.error('Error fetching provider prompts:', error);
    res.status(500).json({ error: 'Failed to fetch prompts' });
  }
});

// Get all versions of a specific prompt
router.get('/:provider/:name/versions', async (req: Request, res: Response) => {
  try {
    const { provider, name } = req.params;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const versions = await promptManager.getPromptVersions(provider as 'lemur' | 'openai', name);

    res.json({
      provider,
      name,
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Error fetching prompt versions:', error);
    res.status(500).json({ error: 'Failed to fetch prompt versions' });
  }
});

// Get active prompt for a provider
router.get('/:provider/:name/active', async (req: Request, res: Response) => {
  try {
    const { provider, name } = req.params;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const prompt = await promptManager.getActivePrompt(provider as 'lemur' | 'openai', name);

    if (!prompt) {
      return res.status(404).json({ error: 'No active prompt found' });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error fetching active prompt:', error);
    res.status(500).json({ error: 'Failed to fetch active prompt' });
  }
});

// Get a specific version
router.get('/:provider/:name/version/:version', async (req: Request, res: Response) => {
  try {
    const { provider, name, version } = req.params;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const versionNum = parseInt(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const prompt = await promptManager.getPromptVersion(
      provider as 'lemur' | 'openai',
      name,
      versionNum
    );

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt version not found' });
    }

    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt version:', error);
    res.status(500).json({ error: 'Failed to fetch prompt version' });
  }
});

// Create a new version
router.post('/:provider/:name/version', async (req: Request, res: Response) => {
  try {
    const { provider, name } = req.params;
    const { prompt_template, description, change_description } = req.body;
    const user = (req as any).user;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!prompt_template) {
      return res.status(400).json({ error: 'prompt_template is required' });
    }

    // Validate prompt template
    const validation = promptManager.validatePromptTemplate(prompt_template);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid prompt template',
        issues: validation.issues
      });
    }

    const result = await promptManager.createPromptVersion(
      provider as 'lemur' | 'openai',
      name,
      prompt_template,
      description || '',
      change_description || 'Updated via API',
      user.email || 'api'
    );

    if (!result) {
      return res.status(500).json({ error: 'Failed to create prompt version' });
    }

    res.json({
      success: true,
      id: result.id,
      version: result.version,
      message: `Created version ${result.version} of ${provider}/${name}`
    });
  } catch (error) {
    console.error('Error creating prompt version:', error);
    res.status(500).json({ error: 'Failed to create prompt version' });
  }
});

// Revert to a specific version
router.post('/:provider/:name/revert/:version', async (req: Request, res: Response) => {
  try {
    const { provider, name, version } = req.params;
    const user = (req as any).user;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const versionNum = parseInt(version);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const success = await promptManager.revertToVersion(
      provider as 'lemur' | 'openai',
      name,
      versionNum,
      user.email || 'api'
    );

    if (!success) {
      return res.status(500).json({ error: 'Failed to revert to version' });
    }

    res.json({
      success: true,
      message: `Reverted ${provider}/${name} to version ${versionNum}`
    });
  } catch (error) {
    console.error('Error reverting prompt version:', error);
    res.status(500).json({ error: 'Failed to revert prompt version' });
  }
});

// Compare two versions
router.get('/:provider/:name/compare', async (req: Request, res: Response) => {
  try {
    const { provider, name } = req.params;
    const { version1, version2 } = req.query;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const v1 = parseInt(version1 as string);
    const v2 = parseInt(version2 as string);

    if (isNaN(v1) || isNaN(v2)) {
      return res.status(400).json({ error: 'Invalid version numbers' });
    }

    const prompt1 = await promptManager.getPromptVersion(provider as 'lemur' | 'openai', name, v1);
    const prompt2 = await promptManager.getPromptVersion(provider as 'lemur' | 'openai', name, v2);

    if (!prompt1 || !prompt2) {
      return res.status(404).json({ error: 'One or both versions not found' });
    }

    const comparison = promptManager.comparePrompts(
      prompt1.prompt_template,
      prompt2.prompt_template
    );

    res.json({
      version1: v1,
      version2: v2,
      prompt1: {
        id: prompt1.id,
        version: prompt1.version,
        created_at: prompt1.created_at
      },
      prompt2: {
        id: prompt2.id,
        version: prompt2.version,
        created_at: prompt2.created_at
      },
      comparison
    });
  } catch (error) {
    console.error('Error comparing prompt versions:', error);
    res.status(500).json({ error: 'Failed to compare prompt versions' });
  }
});

// Test a prompt
router.post('/:provider/:name/test', async (req: Request, res: Response) => {
  try {
    const { provider, name } = req.params;
    const { version, test_input } = req.body;
    const user = (req as any).user;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!test_input) {
      return res.status(400).json({ error: 'test_input is required' });
    }

    let prompt;
    if (version) {
      const versionNum = parseInt(version);
      if (isNaN(versionNum)) {
        return res.status(400).json({ error: 'Invalid version number' });
      }
      prompt = await promptManager.getPromptVersion(provider as 'lemur' | 'openai', name, versionNum);
    } else {
      prompt = await promptManager.getActivePrompt(provider as 'lemur' | 'openai', name);
    }

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    // Here you would normally test the prompt with the AI service
    // For now, we'll just save the test result
    const testResultId = await promptManager.saveTestResult(
      prompt.id,
      test_input,
      'Test output placeholder - implement actual AI testing',
      null,
      'Test feedback - implement scoring logic',
      user.email || 'api'
    );

    res.json({
      success: true,
      message: 'Test saved successfully',
      test_result_id: testResultId,
      note: 'Actual AI testing not yet implemented'
    });
  } catch (error) {
    console.error('Error testing prompt:', error);
    res.status(500).json({ error: 'Failed to test prompt' });
  }
});

// Get test results for a prompt
router.get('/test-results/:promptId', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId);

    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const results = await promptManager.getTestResults(promptId);

    res.json({
      prompt_id: promptId,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
});

// Get prompt statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await promptManager.getPromptStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching prompt stats:', error);
    res.status(500).json({ error: 'Failed to fetch prompt statistics' });
  }
});

// Export all prompts
router.get('/export', async (req: Request, res: Response) => {
  try {
    const exportData = await promptManager.exportPrompts();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=prompts-export-all-${Date.now()}.json`);
    res.send(exportData);
  } catch (error) {
    console.error('Error exporting prompts:', error);
    res.status(500).json({ error: 'Failed to export prompts' });
  }
});

// Export prompts for specific provider
router.get('/export/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!['lemur', 'openai'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const exportData = await promptManager.exportPrompts(provider as 'lemur' | 'openai');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=prompts-export-${provider}-${Date.now()}.json`);
    res.send(exportData);
  } catch (error) {
    console.error('Error exporting prompts:', error);
    res.status(500).json({ error: 'Failed to export prompts' });
  }
});

// Import prompts from backup
router.post('/import', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const jsonData = req.body;

    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({ error: 'Invalid import data' });
    }

    const result = await promptManager.importPrompts(
      JSON.stringify(jsonData),
      user.email || 'api'
    );

    res.json(result);
  } catch (error) {
    console.error('Error importing prompts:', error);
    res.status(500).json({ error: 'Failed to import prompts' });
  }
});

// Template-specific endpoints

// Assign prompts to a template
router.post('/template/:templateId/assign', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const { lemur_prompt_id, openai_prompt_id } = req.body;

    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    // Use direct SQL query since we don't have a template service yet
    const pool = require('../database').default;

    await pool.query(
      `UPDATE templates
       SET lemur_prompt_id = ?, openai_prompt_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [lemur_prompt_id || null, openai_prompt_id || null, templateId]
    );

    res.json({
      success: true,
      message: 'Prompt assignments updated for template',
      template_id: templateId,
      lemur_prompt_id,
      openai_prompt_id
    });
  } catch (error) {
    console.error('Error assigning prompts to template:', error);
    res.status(500).json({ error: 'Failed to assign prompts to template' });
  }
});

// Get template prompt assignments
router.get('/template/:templateId/assignments', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.templateId);

    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const pool = require('../database').default;

    const [rows] = await pool.query(
      `SELECT
        t.id,
        t.template_name,
        t.lemur_prompt_id,
        t.openai_prompt_id,
        lp.version as lemur_version,
        lp.is_active as lemur_active,
        op.version as openai_version,
        op.is_active as openai_active
       FROM templates t
       LEFT JOIN prompts lp ON t.lemur_prompt_id = lp.id
       LEFT JOIN prompts op ON t.openai_prompt_id = op.id
       WHERE t.id = ?`,
      [templateId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching template assignments:', error);
    res.status(500).json({ error: 'Failed to fetch template prompt assignments' });
  }
});

export default router;