import axios from 'axios';
import type { TemplateCriterion } from './lemur';
import { promptManager } from './promptManager';

export interface OpenRouterProviderInputMeta {
  teacher_name: string;
  class_name: string;
  subject: string;
  grade: string;
  template_name: string;
  template_id?: number;
  timing_metrics?: any;
  wait_time_metrics?: any;
}

export interface OpenRouterProviderResult {
  success: boolean;
  analysis?: any;
  error?: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const openRouterProvider = {
  async analyze(
    transcript: string,
    criteria: TemplateCriterion[],
    metadata: OpenRouterProviderInputMeta,
    modelOverride?: string
  ): Promise<OpenRouterProviderResult> {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      const model = modelOverride || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

      if (!apiKey) {
        throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY');
      }

      // Get prompt (prefer template-specific, fallback to active)
      let promptRecord = null as any;
      if (metadata?.template_id) {
        promptRecord = await promptManager.getTemplatePrompt(metadata.template_id, 'openrouter');
        if (promptRecord) {
          console.log(`📝 [OpenRouter] Using template-specific prompt version ${promptRecord.version} (template ${metadata.template_id})`);
        }
      }
      const activePrompt = promptRecord || await promptManager.getActivePrompt('openrouter', 'analysis_prompt');
      if (!activePrompt) {
        throw new Error('No OpenRouter prompt found. Create a template-specific or active OpenRouter analysis prompt.');
      }
      if (!promptRecord) {
        console.log(`📝 [OpenRouter] Using default active prompt version ${activePrompt.version}`);
      }

      // Configuration
      const temperature = clampNum(process.env.OPENROUTER_TEMPERATURE, 0.6, 0, 2);
      const maxTokens = clampNum(process.env.OPENROUTER_MAX_TOKENS, 16384, 256, 32768);
      const batchSize = Math.max(1, Math.min(20, parseInt(process.env.OPENROUTER_BATCH_SIZE || '3', 10)));
      const forceSingle = /^(1|true|yes|on)$/i.test(String(process.env.OPENROUTER_FORCE_SINGLE_PROMPT || 'false'));
      const disableFallback = /^(1|true|yes|on)$/i.test(String(process.env.OPENROUTER_DISABLE_FALLBACK || 'false'));
      const outputMode = String(process.env.OPENROUTER_OUTPUT_MODE || 'minimal').toLowerCase() === 'rich' ? 'rich' : 'minimal';

      let batches = chunkCriteria(criteria, batchSize);
      if (forceSingle) batches = [criteria];

      const aggregated: any = { strengths: [], improvements: [], detailed_feedback: {}, coaching_summary: '' };

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const prompt = processPromptTemplate(activePrompt.prompt_template, transcript, batch, metadata, { singleShot: forceSingle, mode: outputMode as any });
        console.log(`🤖 [OpenRouter] Calling ${model} (batch ${i + 1}/${batches.length}, criteria: ${batch.map(b => b.criteria_name).join(', ')})...`);

        try {
          const analysisJson = await callOpenRouterAndParse(apiKey, model, prompt, temperature, maxTokens);
          mergeIntoAggregated(aggregated, analysisJson);
        } catch (err: any) {
          console.warn(`⚠️ [OpenRouter] Batch ${i + 1} failed: ${err?.message || err}`);
          if (disableFallback) throw err;

          // Per-criterion minimal fallback
          for (const single of batch) {
            const singlePrompt = processPromptTemplate(activePrompt.prompt_template, transcript, [single], metadata, { singleShot: false, minimalPerCriterion: true, mode: 'minimal' });
            console.log(`↩️  [OpenRouter] Retry minimal for "${single.criteria_name}"`);
            try {
              const j = await callOpenRouterAndParse(apiKey, model, singlePrompt, temperature, maxTokens);
              mergeIntoAggregated(aggregated, j);
            } catch (innerErr: any) {
              console.error(`❌ [OpenRouter] Retry failed for "${single.criteria_name}":`, innerErr?.message || innerErr);
              aggregated.detailed_feedback[single.criteria_name] = {
                score: 55,
                feedback: 'AI response unavailable. Assigning motivational baseline.'
              };
            }
          }
        }
      }

      // Trim and synthesize summary
      const unique = (arr: string[]) => Array.from(new Set(arr.map(s => String(s).trim()))).filter(Boolean);
      aggregated.strengths = unique(aggregated.strengths).slice(0, 3);
      aggregated.improvements = unique(aggregated.improvements).slice(0, 3);
      if (!aggregated.coaching_summary || !aggregated.coaching_summary.trim()) {
        aggregated.coaching_summary = buildCoachingSummaryFallback(aggregated, metadata);
      }

      validateAnalysisResponse(aggregated);
      console.log('✅ [OpenRouter] Analysis completed successfully');
      return { success: true, analysis: aggregated };
    } catch (error: any) {
      console.error('❌ OpenRouter analysis failed:', error);
      return { success: false, error: `OpenRouter analysis failed: ${error.message || String(error)}` };
    }
  }
};

function clampNum(v: any, def: number, min: number, max: number): number {
  const n = Number(v);
  const val = Number.isFinite(n) ? n : def;
  return Math.max(min, Math.min(max, val));
}

function chunkCriteria(arr: TemplateCriterion[], size: number): TemplateCriterion[][] {
  const out: TemplateCriterion[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function processPromptTemplate(
  template: string,
  transcript: string,
  criteria: TemplateCriterion[],
  metadata: any,
  options?: { singleShot?: boolean; minimalPerCriterion?: boolean; mode?: 'minimal' | 'rich' }
): string {
  const criteriaList = criteria.map(c => `- ${c.criteria_name} (${c.weight}%): ${c.prompt_template || 'No description provided'}`).join('\n');
  let processedPrompt = template
    .replace(/{{TRANSCRIPT_TEXT}}/g, transcript)
    .replace(/{{TEACHER_NAME}}/g, metadata.teacher_name || 'Unknown Teacher')
    .replace(/{{CLASS_NAME}}/g, metadata.class_name || 'Unknown Class')
    .replace(/{{SUBJECT}}/g, metadata.subject || 'Unknown Subject')
    .replace(/{{GRADE}}/g, metadata.grade || 'Unknown Grade')
    .replace(/{{TEMPLATE_NAME}}/g, metadata.template_name || 'Unknown Template')
    .replace(/{{CRITERIA_LIST}}/g, criteriaList)
    .replace(/{{WAIT_TIME_METRICS}}/g, metadata.wait_time_metrics || 'No wait time metrics available')
    .replace(/{{TIMING_SECTION}}/g, metadata.timing_metrics || 'No timing metrics available');

  if (!processedPrompt.includes('JSON') && !processedPrompt.includes('json')) {
    processedPrompt += '\n\nIMPORTANT: Return ONLY one valid JSON object. No code fences, no backticks, no explanations.';
  }
  const mode = options?.mode || 'minimal';
  if (!options?.minimalPerCriterion) {
    if (mode === 'rich') {
      processedPrompt += '\n\nOUTPUT CONSTRAINTS (rich):\n'
        + '- Total JSON ≤ 8000 characters.\n'
        + '- strengths: max 3 bullet strings; improvements: max 3 bullet strings.\n'
        + '- detailed_feedback: for each criterion: {"score": number, "feedback": string}.\n'
        + '- feedback: ≤3 sentences (≤60 words).\n'
        + '- coaching_summary: ≤120 words.';
    } else {
      processedPrompt += '\n\nOUTPUT CONSTRAINTS (minimal):\n'
        + '- Total JSON ≤ 4000 characters.\n'
        + '- strengths: max 2 bullet strings; improvements: max 2 bullet strings.\n'
        + '- detailed_feedback: include ONLY the criteria listed above with EXACT names; include ONLY two fields per criterion: {"score": number, "feedback": string}.\n'
        + '- feedback: 1 short sentence (≤25 words) per criterion.\n'
        + '- coaching_summary: ≤60 words.';
    }
  }
  if ((options?.singleShot || criteria.length > 12) && !options?.minimalPerCriterion) {
    processedPrompt += '\n- single-shot mode: keep JSON short and valid; do not add extra keys.';
  }
  if (options?.minimalPerCriterion) {
    const names = criteria.map(c => c.criteria_name).join(', ');
    processedPrompt += `\n\nSTRICT OUTPUT FORMAT (minimal per-criterion):\nReturn ONLY this JSON shape (no extra keys):\n{\n  "detailed_feedback": {\n    "<criterion_name>": { "score": number, "feedback": string }\n  }\n}\n- Only include entries for: ${names}.\n- Omit strengths, improvements, coaching_summary, and any other keys.\n- feedback must be 1 short sentence (≤15 words).`;
  }
  return processedPrompt;
}

function validateAnalysisResponse(analysis: any): void {
  const requiredFields = ['strengths', 'improvements', 'detailed_feedback', 'coaching_summary'];
  const missing = requiredFields.filter(k => !analysis[k]);
  if (missing.length) throw new Error(`Analysis response missing required fields: ${missing.join(', ')}`);
  if (typeof analysis.detailed_feedback !== 'object' || Object.keys(analysis.detailed_feedback).length === 0) {
    throw new Error('Analysis response detailed_feedback must contain criteria evaluations');
  }
  for (const [name, data] of Object.entries(analysis.detailed_feedback)) {
    const obj: any = data;
    if (typeof obj.score !== 'number') throw new Error(`Criterion ${name} must have a numeric score`);
    if (typeof obj.feedback !== 'string') throw new Error(`Criterion ${name} must have feedback text`);
  }
}

function buildCoachingSummaryFallback(analysis: any, metadata: any): string {
  const df = analysis?.detailed_feedback || {};
  const entries = Object.entries(df) as Array<[string, any]>;
  const scored = entries.map(([k, v]) => ({ name: k, score: Number((v || {}).score) })).filter(x => Number.isFinite(x.score));
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 2).map(x => `${x.name} (${x.score})`);
  const bottom = [...scored].sort((a, b) => a.score - b.score).slice(0, 2).map(x => `${x.name} (${x.score})`);
  const subj = metadata?.subject || 'the subject';
  const grade = metadata?.grade || 'the grade level';
  return `Celebrating strengths in ${top.join(' and ')}. Prioritize growth in ${bottom.join(' and ')}. Keep moves tangible and student-facing to lift clarity and participation in ${subj} for ${grade}.`;
}

function mergeIntoAggregated(target: any, part: any) {
  if (!part || typeof part !== 'object') return;
  if (part.detailed_feedback && typeof part.detailed_feedback === 'object') {
    for (const [k, v] of Object.entries(part.detailed_feedback)) {
      target.detailed_feedback[k] = v;
    }
  }
  if (Array.isArray(part.strengths)) target.strengths.push(...part.strengths);
  if (Array.isArray(part.improvements)) target.improvements.push(...part.improvements);
  if (!target.coaching_summary && typeof part.coaching_summary === 'string') {
    target.coaching_summary = part.coaching_summary;
  }
}

async function callOpenRouterAndParse(apiKey: string, model: string, prompt: string, temperature: number, maxTokens: number): Promise<any> {
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://classreflect.gdwd.co.uk',
        'X-Title': 'ClassReflect'
      },
      timeout: 120000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  try {
    return parseJsonLoose(content);
  } catch (e) {
    console.error('[OpenRouter] Failed to parse JSON:', e);
    console.log('[OpenRouter] Raw snippet:', String(content).slice(0, 500));
    throw new Error('Could not parse OpenRouter response as valid JSON');
  }
}

function parseJsonLoose(content: string): any {
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return undefined; } };
  if (!content || typeof content !== 'string') throw new SyntaxError('Empty or non-string content');
  let parsed = tryParse(content);
  if (parsed !== undefined) return parsed;
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) { parsed = tryParse(fence[1]); if (parsed !== undefined) return parsed; }
  const first = content.indexOf('{');
  const last = content.lastIndexOf('}');
  if (first >= 0 && last > first) { parsed = tryParse(content.slice(first, last + 1)); if (parsed !== undefined) return parsed; }
  const cleaned = content.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '').trim();
  parsed = tryParse(cleaned);
  if (parsed !== undefined) return parsed;
  throw new SyntaxError('Failed to parse JSON response. Snippet: ' + cleaned.slice(0, 500));
}