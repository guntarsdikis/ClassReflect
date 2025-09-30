import axios from 'axios';
import type { TemplateCriterion } from './lemur';
import { promptManager } from './promptManager';

export interface VertexProviderInputMeta {
  teacher_name: string;
  class_name: string;
  subject: string;
  grade: string;
  template_name: string;
  template_id?: number;
  timing_metrics?: any;
  wait_time_metrics?: any;
}

export interface VertexProviderResult {
  success: boolean;
  analysis?: any;
  error?: string;
}

export const vertexProvider = {
  async analyze(
    transcript: string,
    criteria: TemplateCriterion[],
    metadata: VertexProviderInputMeta
  ): Promise<VertexProviderResult> {
    try {
      const projectId = process.env.VERTEX_PROJECT_ID || '';
      const location = process.env.VERTEX_LOCATION || 'us-central1';
      const modelName = process.env.VERTEX_MODEL || 'gemini-1.5-pro-001';
      const apiKey = process.env.VERTEX_API_KEY || '';

      if (!projectId || !apiKey) {
        throw new Error('Vertex AI is not configured. Please set VERTEX_PROJECT_ID and VERTEX_API_KEY');
      }

      // Prefer template-specific Gemini prompt; fallback to active Gemini prompt
      let promptRecord = null as any;
      if (metadata?.template_id) {
        promptRecord = await promptManager.getTemplatePrompt(metadata.template_id, 'gemini');
        if (promptRecord) {
          console.log(`📝 [Vertex] Using template-specific prompt version ${promptRecord.version} (template ${metadata.template_id})`);
        }
      }
      const activePrompt = promptRecord || await promptManager.getActivePrompt('gemini', 'analysis_prompt');
      if (!activePrompt) {
        throw new Error('No Gemini prompt found for Vertex. Create a template-specific or active Gemini analysis prompt.');
      }
      if (!promptRecord) {
        console.log(`📝 [Vertex] Using default active prompt version ${activePrompt.version}`);
      }

      const generationConfig: any = {
        temperature: clampNum(process.env.GEMINI_TEMPERATURE, 0.6, 0, 2),
        topK: clampNum(process.env.GEMINI_TOP_K, 40, 1, 100),
        topP: clampNum(process.env.GEMINI_TOP_P, 0.95, 0, 1),
        maxOutputTokens: clampNum(process.env.GEMINI_MAX_OUTPUT_TOKENS, 16384, 256, 32768),
        responseMimeType: 'application/json'
      };

      const batchSize = Math.max(1, Math.min(20, parseInt(process.env.GEMINI_CRITERIA_BATCH_SIZE || '3', 10)));
      const forceSingle = /^(1|true|yes|on)$/i.test(String(process.env.GEMINI_FORCE_SINGLE_PROMPT || 'false'));
      const disableFallback = /^(1|true|yes|on)$/i.test(String(process.env.GEMINI_DISABLE_FALLBACK || 'false'));
      const outputMode = String(process.env.GEMINI_OUTPUT_MODE || 'minimal').toLowerCase() === 'rich' ? 'rich' : 'minimal';

      let batches = chunkCriteria(criteria, batchSize);
      if (forceSingle) batches = [criteria];

      const aggregated: any = { strengths: [], improvements: [], detailed_feedback: {}, coaching_summary: '' };

      const endpointBase = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const prompt = processPromptTemplate(activePrompt.prompt_template, transcript, batch, metadata, { singleShot: forceSingle, mode: outputMode as any });
        console.log(`🤖 [Vertex] Calling Gemini via Vertex (batch ${i + 1}/${batches.length}, criteria: ${batch.map(b => b.criteria_name).join(', ')})...`);

        try {
          const analysisJson = await callVertexAndParse(endpointBase, prompt, generationConfig);
          mergeIntoAggregated(aggregated, analysisJson);
        } catch (err: any) {
          console.warn(`⚠️ [Vertex] Batch ${i + 1} failed: ${err?.message || err}`);
          if (disableFallback) throw err;

          // Per-criterion minimal fallback
          for (const single of batch) {
            const singlePrompt = processPromptTemplate(activePrompt.prompt_template, transcript, [single], metadata, { singleShot: false, minimalPerCriterion: true, mode: 'minimal' });
            console.log(`↩️  [Vertex] Retry minimal for "${single.criteria_name}"`);
            try {
              const j = await callVertexAndParse(endpointBase, singlePrompt, generationConfig);
              try { console.log(`[vertex fallback] ${single.criteria_name}:`, JSON.stringify(j).slice(0, 800)); } catch {}
              mergeIntoAggregated(aggregated, j);
            } catch (innerErr: any) {
              console.error(`❌ [Vertex] Retry failed for "${single.criteria_name}":`, innerErr?.message || innerErr);
              aggregated.detailed_feedback[single.criteria_name] = {
                score: 55,
                feedback: 'AI response unavailable. Assigning motivational baseline. Plan one small, visible move next lesson.'
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
      console.log('✅ [Vertex] Analysis completed successfully');
      return { success: true, analysis: aggregated };
    } catch (error: any) {
      console.error('❌ Vertex analysis failed:', error);
      return { success: false, error: `Vertex analysis failed: ${error.message || String(error)}` };
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
      processedPrompt += '\n\nOUTPUT CONSTRAINTS (rich, tight budgets):\n'
        + '- Total JSON ≤ 8000 characters.\n'
        + '- strengths: max 3 bullet strings; improvements: max 3 bullet strings.\n'
        + '- detailed_feedback: for each criterion: {"score": number, "feedback": string}.\n'
        + '- feedback: ≤3 sentences (≤60 words).\n'
        + '- coaching_summary: ≤120 words.';
    } else {
      processedPrompt += '\n\nOUTPUT CONSTRAINTS (to fit response budget):\n'
        + '- Total JSON ≤ 4000 characters.\n'
        + '- strengths: max 2 bullet strings; improvements: max 2 bullet strings.\n'
        + '- detailed_feedback: include ONLY the criteria listed above (no others), with EXACT names; include ONLY two fields per criterion: {"score": number, "feedback": string}.\n'
        + '- feedback: 1 short sentence (≤25 words) per criterion.\n'
        + '- coaching_summary: ≤60 words.';
    }
  }
  if ((options?.singleShot || criteria.length > 12) && !options?.minimalPerCriterion) {
    processedPrompt += '\n- single-shot mode: keep JSON short and valid; do not add extra keys.';
  }
  if (options?.minimalPerCriterion) {
    const names = criteria.map(c => c.criteria_name).join(', ');
    processedPrompt += `\n\nSTRICT OUTPUT FORMAT (minimal per-criterion):\nReturn ONLY this JSON shape (no extra keys):\n{\n  \"detailed_feedback\": {\n    \"<criterion_name>\": { \"score\": number, \"feedback\": string }\n  }\n}\n- Only include entries for: ${names}.\n- Omit strengths, improvements, coaching_summary, and any other keys.\n- feedback must be 1 short sentence (≤15 words).`;
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

async function callVertexAndParse(endpoint: string, prompt: string, generationConfig: any): Promise<any> {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig
  };
  const res = await axios.post(endpoint, body, { timeout: 120000 });
  const analysisText = extractResponseText(res.data);
  try {
    return parseJsonLoose(analysisText);
  } catch (e) {
    console.error('[Vertex] Failed to parse JSON:', e);
    console.log('[Vertex] Raw snippet:', String(analysisText || '').slice(0, 500));
    throw new Error('Could not parse Vertex response as valid JSON');
  }
}

function extractResponseText(resp: any): string {
  try {
    const cands = resp?.candidates;
    if (Array.isArray(cands)) {
      for (const c of cands) {
        const parts = c?.content?.parts;
        if (Array.isArray(parts)) {
          const chunks: string[] = [];
          for (const p of parts) {
            if (typeof p?.text === 'string') chunks.push(p.text);
            else if (p && typeof p === 'object' && 'json' in p && p.json) chunks.push(JSON.stringify(p.json));
          }
          const all = chunks.join('\n').trim();
          if (all) return all;
        }
      }
    }
  } catch {}
  return '';
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

