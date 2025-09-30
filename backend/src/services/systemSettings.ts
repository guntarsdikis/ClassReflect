import { Pool } from 'mysql2/promise';

export type AnalysisSettings = {
  provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';
  openai_model?: string;
  openrouter_model?: string;
};

const DEFAULT_SETTINGS: AnalysisSettings = {
  provider:
    (process.env.ANALYSIS_PROVIDER as any) === 'openai' ? 'openai' :
    (process.env.ANALYSIS_PROVIDER as any) === 'gemini' ? 'gemini' :
    (process.env.ANALYSIS_PROVIDER as any) === 'vertex' ? 'vertex' :
    (process.env.ANALYSIS_PROVIDER as any) === 'openrouter' ? 'openrouter' : 'lemur',
  openai_model: process.env.OPENAI_MODEL || 'gpt-4o',
  openrouter_model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
};

export async function ensureSystemSettingsTable(pool: Pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      \`value\` JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function getAnalysisSettings(pool: Pool): Promise<AnalysisSettings> {
  try {
    await ensureSystemSettingsTable(pool);
    const [rows] = await pool.execute(`SELECT \`value\` FROM system_settings WHERE \`key\` = 'analysis_provider' LIMIT 1`);
    const arr = rows as any[];
    if (arr.length > 0 && arr[0].value) {
      const parsed = typeof arr[0].value === 'string' ? JSON.parse(arr[0].value) : arr[0].value;
      const provider = (parsed.provider === 'openai') ? 'openai'
        : (parsed.provider === 'gemini') ? 'gemini'
        : (parsed.provider === 'vertex') ? 'vertex'
        : (parsed.provider === 'openrouter') ? 'openrouter'
        : 'lemur';
      const openai_model = parsed.openai_model || DEFAULT_SETTINGS.openai_model;
      const openrouter_model = parsed.openrouter_model || DEFAULT_SETTINGS.openrouter_model;
      return { provider, openai_model, openrouter_model };
    }
  } catch (e) {
    console.warn('⚠️ Failed to read analysis settings; falling back to env defaults', e);
  }
  return DEFAULT_SETTINGS;
}

export async function setAnalysisSettings(pool: Pool, settings: AnalysisSettings): Promise<void> {
  await ensureSystemSettingsTable(pool);
  const provider = settings.provider === 'openai' ? 'openai'
    : settings.provider === 'gemini' ? 'gemini'
    : settings.provider === 'vertex' ? 'vertex'
    : settings.provider === 'openrouter' ? 'openrouter'
    : 'lemur';
  const openai_model = settings.openai_model || DEFAULT_SETTINGS.openai_model;
  const openrouter_model = settings.openrouter_model || DEFAULT_SETTINGS.openrouter_model;
  const value = JSON.stringify({ provider, openai_model, openrouter_model });
  await pool.execute(
    `REPLACE INTO system_settings (\`key\`, \`value\`) VALUES ('analysis_provider', CAST(? AS JSON))`,
    [value]
  );
}
