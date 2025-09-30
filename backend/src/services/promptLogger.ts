import fs from 'fs/promises';
import path from 'path';
import type { TemplateCriterion } from './lemur';

export interface PromptLogOptions {
  analysisJobId: string;
  provider: 'openai' | 'lemur' | 'gemini' | 'vertex' | 'openrouter';
  model?: string;
  jobId: string;
  transcriptId?: string; // AssemblyAI transcript ID (for LeMUR)
  templateName: string;
  criterions: TemplateCriterion[];
  pauseMetrics?: any;
  timingContext?: string | null;
  promptContent: string; // The actual prompt payload sent to the provider
}

export async function savePromptMarkdown(opts: PromptLogOptions): Promise<string | null> {
  try {
    // Allow disabling prompt logging via env var.
    // Any of: '0', 'false', 'no', 'off' (case-insensitive) disables logging. Missing/other values enable it.
    const rawEnabled = process.env.PROMPT_LOG_ENABLED;
    const isDisabled = rawEnabled ? /^(0|false|no|off)$/i.test(rawEnabled.trim()) : false;
    if (isDisabled) {
      return null;
    }

    const baseDir = process.env.PROMPT_LOG_DIR
      ? path.resolve(process.env.PROMPT_LOG_DIR)
      : path.resolve(process.cwd(), 'storage', 'prompts');

    await fs.mkdir(baseDir, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const safe = (s: string) => (s || '').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${dateStr}__${safe(opts.analysisJobId)}__${safe(opts.provider)}__${safe(opts.jobId)}.md`;
    const filePath = path.join(baseDir, fileName);

    const criteriaLines = opts.criterions.map(c => `- ${c.criteria_name} (${c.weight}%): ${c.prompt_template || ''}`);

    const pause = opts.pauseMetrics ? `\n${JSON.stringify(opts.pauseMetrics, null, 2)}\n` : 'Not available';
    const timing = opts.timingContext ? `\n${opts.timingContext}\n` : 'Not available';

    const content = [
      `# Analysis Prompt Log`,
      ``,
      `- Date: ${now.toISOString()}`,
      `- Analysis Job ID: ${opts.analysisJobId}`,
      `- Recording Job ID: ${opts.jobId}`,
      `- Provider: ${opts.provider}`,
      `- Model: ${opts.model || 'default'}`,
      `- Template: ${opts.templateName}`,
      `- Transcript ID: ${opts.transcriptId || 'N/A'}`,
      ``,
      `## Criterions`,
      criteriaLines.join('\n'),
      ``,
      `## Pause Metrics`,
      pause,
      ``,
      `## Timing Context`,
      timing,
      ``,
      `## Prompt Payload Sent`,
      '```text',
      opts.promptContent,
      '```',
      ''
    ].join('\n');

    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  } catch (e) {
    console.warn('Prompt logging failed:', (e as any)?.message || e);
    return null;
  }
}

export interface ModelOutputLogOptions {
  analysisJobId: string;
  provider: 'openai' | 'lemur' | 'gemini' | 'vertex' | 'openrouter';
  model?: string;
  jobId: string;
  transcriptId?: string;
  templateName: string;
  result: any; // Parsed JSON result from provider
}

/**
 * Save the full AI model JSON output to a .json file for auditing/debugging.
 * Respects PROMPT_LOG_ENABLED and PROMPT_LOG_DIR (same behavior as savePromptMarkdown).
 */
export async function saveModelOutputJson(opts: ModelOutputLogOptions): Promise<string | null> {
  try {
    const rawEnabled = process.env.PROMPT_LOG_ENABLED;
    const isDisabled = rawEnabled ? /^(0|false|no|off)$/i.test(rawEnabled.trim()) : false;
    if (isDisabled) return null;

    const baseDir = process.env.PROMPT_LOG_DIR
      ? path.resolve(process.env.PROMPT_LOG_DIR)
      : path.resolve(process.cwd(), 'storage', 'prompts');
    await fs.mkdir(baseDir, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const safe = (s: string) => (s || '').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${dateStr}__${safe(opts.analysisJobId)}__${safe(opts.provider)}__${safe(opts.jobId)}__output.json`;
    const filePath = path.join(baseDir, fileName);

    const metadata = {
      date: now.toISOString(),
      analysis_job_id: opts.analysisJobId,
      recording_job_id: opts.jobId,
      provider: opts.provider,
      model: opts.model || 'default',
      template: opts.templateName,
      transcript_id: opts.transcriptId || 'N/A',
    };

    const payload = {
      metadata,
      result: opts.result
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
  } catch (e) {
    console.warn('Model output logging failed:', (e as any)?.message || e);
    return null;
  }
}
