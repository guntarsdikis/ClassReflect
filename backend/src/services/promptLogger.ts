import fs from 'fs/promises';
import path from 'path';
import type { TemplateCriterion } from './lemur';

export interface PromptLogOptions {
  analysisJobId: string;
  provider: 'openai' | 'lemur';
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

