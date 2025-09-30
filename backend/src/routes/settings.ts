import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { authenticate, authorize } from '../middleware/auth';
import { getAnalysisSettings, setAnalysisSettings } from '../services/systemSettings';

const router = Router();
let pool: Pool;

export const initializeSettingsRoutes = (dbPool: Pool) => {
  pool = dbPool;
};

// GET current analysis provider settings
router.get('/analysis-provider', authenticate, authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const settings = await getAnalysisSettings(pool);
    res.json({
      provider: settings.provider,
      openai_model: settings.openai_model,
      openrouter_model: settings.openrouter_model,
      providers: ['lemur', 'openai', 'gemini', 'vertex', 'openrouter']
    });
  } catch (error) {
    console.error('Get analysis provider settings error:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT update analysis provider settings
router.put('/analysis-provider', authenticate, authorize('super_admin'), async (req: Request, res: Response) => {
  try {
    const { provider, openai_model, openrouter_model } = req.body || {};
    if (!provider || !['lemur', 'openai', 'gemini', 'vertex', 'openrouter'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider. Use "lemur", "openai", "gemini", "vertex", or "openrouter".' });
    }
    await setAnalysisSettings(pool, { provider, openai_model, openrouter_model });
    const updated = await getAnalysisSettings(pool);
    res.json(updated);
  } catch (error) {
    console.error('Update analysis provider settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
