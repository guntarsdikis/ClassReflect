import { GoogleGenerativeAI } from '@google/generative-ai'; // restart trigger
import type { TemplateCriterion } from './lemur';
import { promptManager } from './promptManager';
// Note: file-based logging is handled centrally in analysis.ts via promptLogger.

export interface GeminiProvider {
  analyze(
    transcript: string,
    criteria: TemplateCriterion[],
    metadata: {
      teacher_name: string;
      class_name: string;
      subject: string;
      grade: string;
      template_name: string;
      template_id?: number;
      timing_metrics?: any;
      wait_time_metrics?: any;
    }
  ): Promise<{
    success: boolean;
    analysis?: any;
    error?: string;
  }>;
}

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

export const geminiProvider: GeminiProvider = {
  async analyze(transcript, criteria, metadata) {
    try {
      // Prefer template-specific prompt if available, else fallback to active provider default
      let promptRecord = null as any;
      if (metadata?.template_id) {
        promptRecord = await promptManager.getTemplatePrompt(metadata.template_id, 'gemini');
        if (promptRecord) {
          console.log(`📝 Using template-specific prompt version ${promptRecord.version} (template ${metadata.template_id})`);
        }
      }
      const activePrompt = promptRecord || await promptManager.getActivePrompt('gemini', 'analysis_prompt');

      if (!activePrompt) {
        throw new Error('No Gemini prompt found. Please create a template-specific or active Gemini analysis prompt.');
      }
      if (!promptRecord) {
        console.log(`📝 Using default active prompt version ${activePrompt.version}`);
      }

      // Get the Gemini model (normalize common aliases for v1beta support)
      const rawModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const normalizedModel = /^(gemini-1\.5-(pro|flash))$/.test(rawModel)
        ? `${rawModel}-latest`
        : rawModel;
      const model = genAI.getGenerativeModel({ model: normalizedModel });

      // Configure generation parameters for better JSON output
      // Default OFF to maximize compatibility with current SDK behavior.
      const jsonMimeEnabled = !(/^(0|false|no|off)$/i.test(String(process.env.GEMINI_USE_JSON_MIME || 'false')));
      const parseNum = (v: any, def: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
      };
      const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
      const temperature = clamp(parseNum(process.env.GEMINI_TEMPERATURE, 0.6), 0, 2);
      const topK = clamp(parseNum(process.env.GEMINI_TOP_K, 40), 1, 100);
      const topP = clamp(parseNum(process.env.GEMINI_TOP_P, 0.95), 0, 1);
      const maxOutputTokens = clamp(parseNum(process.env.GEMINI_MAX_OUTPUT_TOKENS, 16384), 256, 32768);
      const generationConfig: any = {
        temperature,
        topK,
        topP,
        maxOutputTokens,
      };
      if (jsonMimeEnabled) {
        generationConfig.responseMimeType = 'application/json';
        // Note: responseSchema is not included to avoid API 400s; the v1beta API
        // may reject OpenAPI-like fields such as additionalProperties.
      }

      // If many criteria, analyze in batches to avoid token limits (can be overridden)
      const batchSize = Math.max(1, Math.min(20, parseInt(process.env.GEMINI_CRITERIA_BATCH_SIZE || '3', 10)));
      const forceSingle = /^(1|true|yes|on)$/i.test(String(process.env.GEMINI_FORCE_SINGLE_PROMPT || 'false'));
      const disableFallback = /^(1|true|yes|on)$/i.test(String(process.env.GEMINI_DISABLE_FALLBACK || 'false'));
      const outputMode = String(process.env.GEMINI_OUTPUT_MODE || 'minimal').toLowerCase() === 'rich' ? 'rich' : 'minimal';
      let batches = chunkCriteria(criteria, batchSize);
      if (forceSingle) {
        batches = [criteria];
      }

      const aggregated: any = {
        strengths: [] as string[],
        improvements: [] as string[],
        detailed_feedback: {} as Record<string, any>,
        coaching_summary: ''
      };

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const processedPrompt = processPromptTemplate(
          activePrompt.prompt_template,
          transcript,
          batch,
          metadata,
          { singleShot: forceSingle, mode: outputMode as any }
        );

        console.log(`🤖 Calling Gemini API for analysis (batch ${i + 1}/${batches.length}, criteria: ${batch.map(b => b.criteria_name).join(', ')})...`);
        try {
          const analysisJson = await callGeminiAndParse(model, generationConfig, processedPrompt);
          mergeIntoAggregated(aggregated, analysisJson);
        } catch (err: any) {
          console.warn(`⚠️ Batch ${i + 1} failed (${err?.message || err}). Retrying per-criterion with tighter constraints...`);

          if (disableFallback) {
            throw err;
          }

          // Fallback: analyze each criterion individually with stricter config
          const tighterConfig: any = { ...generationConfig };
          // Prefer JSON mime for fallback to ensure structured output
          if (!tighterConfig.responseMimeType) tighterConfig.responseMimeType = 'application/json';
          // Give a bit more room in case the model needed it; also clamp upper bound
          tighterConfig.maxOutputTokens = Math.min(4096, Math.max(1024, Number(generationConfig?.maxOutputTokens || 2048)));

          for (const single of batch) {
            const singlePrompt = processPromptTemplate(
              activePrompt.prompt_template,
              transcript,
              [single],
              metadata,
              { singleShot: false, minimalPerCriterion: true, mode: 'minimal' as any }
            );
            console.log(`↩️  Retry: criterion "${single.criteria_name}" with stricter config`);
            try {
              const j = await callGeminiAndParse(model, tighterConfig, singlePrompt);
              try { console.log(`[fallback] minimal JSON for ${single.criteria_name}:`, JSON.stringify(j).slice(0, 800)); } catch {}
              mergeIntoAggregated(aggregated, j);
            } catch (innerErr: any) {
              console.error(`❌ Retry failed for criterion "${single.criteria_name}":`, innerErr?.message || innerErr);
              // As last resort, inject a minimal placeholder so downstream code can proceed
              aggregated.detailed_feedback[single.criteria_name] = {
                score: 55,
                feedback: 'AI response unavailable due to provider output constraints. Assigning motivational baseline. Focus on 1 small, visible move next lesson.'
              };
            }
          }
        }
      }

      // Trim strengths/improvements to top 3 unique items
      const unique = (arr: string[]) => Array.from(new Set(arr.map(s => String(s).trim()))).filter(Boolean);
      aggregated.strengths = unique(aggregated.strengths).slice(0, 3);
      aggregated.improvements = unique(aggregated.improvements).slice(0, 3);

      // Ensure coaching_summary exists; if missing, synthesize a concise one
      if (!aggregated.coaching_summary || !aggregated.coaching_summary.trim()) {
        try {
          aggregated.coaching_summary = buildCoachingSummaryFallback(aggregated, metadata);
        } catch {
          aggregated.coaching_summary = 'Summary synthesized from per-criterion feedback. Focus on top strengths and top improvement priorities.';
        }
      }

      // Validate the aggregated structure
      validateAnalysisResponse(aggregated);

      console.log('✅ Gemini analysis completed successfully (batched)');

      return { success: true, analysis: aggregated };
    } catch (error: any) {
      console.error('❌ Gemini analysis failed:', error);

      // Disk logging is centralized; rely on analysis.ts for unified logs.

      return {
        success: false,
        error: `Gemini analysis failed: ${error.message}`
      };
    }
  }
};

// Helper function to process prompt template
function processPromptTemplate(
  template: string,
  transcript: string,
  criteria: TemplateCriterion[],
  metadata: any,
  options?: { singleShot?: boolean; minimalPerCriterion?: boolean; mode?: 'minimal' | 'rich' }
): string {
  // Format criteria list with weights and definitions
  const criteriaList = criteria.map(c =>
    `- ${c.criteria_name} (${c.weight}%): ${c.prompt_template || 'No description provided'}`
  ).join('\n');

  // Replace all template variables
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

  // Add a note to ensure JSON output and keep it concise to avoid token overflows
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
        + '- coaching_summary: ≤120 words.\n'
        + '- Optional (concise): next_lesson_plan (3 short steps), prioritized_criteria (≤2), admin_notes (≤2 bullets).';
    } else {
      processedPrompt += '\n\nOUTPUT CONSTRAINTS (to fit response budget):\n'
        + '- Total JSON ≤ 4000 characters.\n'
        + '- strengths: max 2 bullet strings; improvements: max 2 bullet strings.\n'
        + '- detailed_feedback: include ONLY the criteria listed above (no others), with EXACT names; include ONLY two fields per criterion: {"score": number, "feedback": string}.\n'
        + '- feedback: 1 short sentence (≤25 words) per criterion.\n'
        + '- coaching_summary: ≤60 words.';
    }
  }

  // In single-shot mode or when criteria are many, compress further
  if ((options?.singleShot || criteria.length > 12) && !options?.minimalPerCriterion) {
    processedPrompt += '\n- single-shot mode: for each criterion, feedback must be exactly 1 sentence (≤20 words).\n- Do NOT include any fields other than score and feedback.\n- strengths/improvements arrays: ≤2 items each.\n- coaching_summary: ≤40 words.\n- Do NOT include fields such as next_lesson_plan, prioritized_criteria, admin_notes.';
  }

  // Minimal per-criterion mode: only return detailed_feedback for the provided criterion(s)
  if (options?.minimalPerCriterion) {
    const names = criteria.map(c => c.criteria_name).join(', ');
    processedPrompt += `\n\nSTRICT OUTPUT FORMAT (minimal per-criterion):\nReturn ONLY this JSON shape (no extra keys):\n{\n  "detailed_feedback": {\n    "<criterion_name>": { "score": number, "feedback": string }\n  }\n}\n- Only include entries for: ${names}.\n- Omit strengths, improvements, coaching_summary, and any other keys.\n- feedback must be 1 short sentence (≤15 words).`;
  }

  return processedPrompt;
}

// Validate that the response has the expected structure
function validateAnalysisResponse(analysis: any): void {
  const requiredFields = ['strengths', 'improvements', 'detailed_feedback', 'coaching_summary'];
  const missingFields = requiredFields.filter(field => !analysis[field]);

  if (missingFields.length > 0) {
    throw new Error(`Analysis response missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate detailed_feedback has criteria
  if (typeof analysis.detailed_feedback !== 'object' || Object.keys(analysis.detailed_feedback).length === 0) {
    throw new Error('Analysis response detailed_feedback must contain criteria evaluations');
  }

  // Validate each criterion has required fields
  for (const [criterionName, criterionData] of Object.entries(analysis.detailed_feedback)) {
    if (typeof criterionData !== 'object') {
      throw new Error(`Criterion ${criterionName} must be an object`);
    }

    const criterion = criterionData as any;
    if (typeof criterion.score !== 'number' || criterion.score < 0 || criterion.score > 100) {
      throw new Error(`Criterion ${criterionName} must have a valid score between 0 and 100`);
    }

    if (!criterion.feedback || typeof criterion.feedback !== 'string') {
      throw new Error(`Criterion ${criterionName} must have feedback text`);
    }
  }
}

// Calculate approximate cost based on token usage
function calculateCost(inputTokens: number, outputTokens: number): number {
  // Gemini pricing (as of 2024):
  // Free tier: 60 requests per minute (no cost)
  // After free tier: $0.00025 per 1K characters for input, $0.0005 per 1K characters for output
  // This is approximate - actual pricing may vary

  const inputCost = (inputTokens / 1000) * 0.00025;
  const outputCost = (outputTokens / 1000) * 0.0005;

  return inputCost + outputCost;
}

// Tolerant JSON parser similar to OpenAI provider's approach
function parseJsonLoose(content: string): any {
  const tryParse = (s: string) => {
    try { return JSON.parse(s); } catch { return undefined; }
  };

  if (!content || typeof content !== 'string') {
    throw new SyntaxError('Empty or non-string content');
  }

  // First attempt: direct parse
  let parsed = tryParse(content);
  if (parsed !== undefined) return parsed;

  // Strip code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    parsed = tryParse(fenceMatch[1]);
    if (parsed !== undefined) return parsed;
  }

  // Remove leading non-brace content and trailing after last brace
  const first = content.indexOf('{');
  const last = content.lastIndexOf('}');
  if (first >= 0 && last > first) {
    parsed = tryParse(content.slice(first, last + 1));
    if (parsed !== undefined) return parsed;
  }

  // Try to unescape common markdown artifacts
  const cleaned = content
    .replace(/^\s*```[a-z]*\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  parsed = tryParse(cleaned);
  if (parsed !== undefined) return parsed;

  // Last resort: throw with context snippet
  throw new SyntaxError('Failed to parse JSON response. Snippet: ' + cleaned.slice(0, 500));
}

async function extractResponseText(response: any): Promise<string> {
  try {
    if (typeof response?.text === 'function') {
      const t = await response.text();
      if (typeof t === 'string' && t.trim()) return t;
    } else if (typeof (response as any)?.text === 'string' && (response as any).text.trim()) {
      return (response as any).text;
    }
  } catch {}

  try {
    const candidates = response?.candidates;
    if (Array.isArray(candidates)) {
      for (const cand of candidates) {
        const parts = cand?.content?.parts;
        if (Array.isArray(parts)) {
          const chunks: string[] = [];
          for (const p of parts) {
            if (typeof p?.text === 'string') {
              chunks.push(p.text);
              continue;
            }
            if (p && typeof p === 'object' && 'json' in p && p.json) {
              try {
                chunks.push(JSON.stringify(p.json));
                continue;
              } catch {}
            }
            const inline = p?.inlineData;
            if (inline && typeof inline?.data === 'string') {
              try {
                const decoded = Buffer.from(inline.data, 'base64').toString('utf8');
                if (decoded.trim()) chunks.push(decoded);
              } catch {}
            }
          }
          const joined = chunks.join('\n').trim();
          if (joined) return joined;
        }
        // Some SDK shapes surface function calls directly on the candidate
        if (cand?.functionCall) {
          try {
            const fc = cand.functionCall;
            if (fc?.args) return JSON.stringify(fc.args);
            return JSON.stringify(fc);
          } catch {}
        }
      }
    }
  } catch {}

  // Fallback: top-level functionCalls/functionCall on the response
  try {
    const fcs = (response as any)?.functionCalls;
    if (Array.isArray(fcs) && fcs.length) {
      const fc = fcs[0];
      if (fc?.args) return JSON.stringify(fc.args);
      return JSON.stringify(fc);
    }
    const fc = (response as any)?.functionCall;
    if (fc) {
      if (fc?.args) return JSON.stringify(fc.args);
      return JSON.stringify(fc);
    }
  } catch {}

  return '';
}

function summarizeResponseShape(resp: any) {
  try {
    const shape: any = {};
    if (!resp || typeof resp !== 'object') return { type: typeof resp };
    shape.keys = Object.keys(resp);
    if (Array.isArray((resp as any).candidates)) {
      shape.candidates = (resp as any).candidates.map((c: any, idx: number) => {
        const obj: any = { idx, finishReason: c?.finishReason };
        const parts = c?.content?.parts;
        if (Array.isArray(parts)) {
          obj.parts = parts.map((p: any) => ({
            keys: Object.keys(p || {}),
            hasText: typeof p?.text === 'string' && p.text.length > 0,
            hasInlineData: !!p?.inlineData,
          }));
        } else {
          obj.parts = typeof parts;
        }
        return obj;
      });
    }
    const pf = (resp as any).promptFeedback;
    if (pf) {
      shape.promptFeedback = { blockReason: pf.blockReason, safetyRatingsCount: Array.isArray(pf.safetyRatings) ? pf.safetyRatings.length : undefined };
    }
    return shape;
  } catch {
    return { error: 'shape-failed' };
  }
}

function chunkCriteria(arr: TemplateCriterion[], size: number): TemplateCriterion[][] {
  const out: TemplateCriterion[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

async function callGeminiAndParse(model: any, generationConfig: any, prompt: string): Promise<any> {
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  });
  const response = await result.response;
  try {
    const fr = Array.isArray((response as any)?.candidates) ? (response as any).candidates[0]?.finishReason : undefined;
    if (fr === 'MAX_TOKENS') {
      console.warn('⚠️ Gemini finishReason=MAX_TOKENS — output likely truncated.');
    }
  } catch {}
  const analysisText = await extractResponseText(response);
  if (!analysisText || !String(analysisText).trim()) {
    try {
      const shape = summarizeResponseShape(response);
      console.log('ℹ️ Gemini response shape (no text extracted):', JSON.stringify(shape));
    } catch {}
  }
  let analysisJson: any;
  try {
    analysisJson = parseJsonLoose(analysisText);
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', e);
    console.log('Raw response snippet:', (analysisText || '').slice(0, 500));
    throw new Error('Could not parse Gemini response as valid JSON. The model may need prompt adjustments.');
  }
  return analysisJson;
}

function buildCoachingSummaryFallback(analysis: any, metadata: any): string {
  const df = analysis?.detailed_feedback || {};
  const entries = Object.entries(df) as Array<[string, any]>;
  const sorted = entries
    .map(([k, v]) => ({ name: k, score: Number((v || {}).score) }))
    .filter(x => Number.isFinite(x.score));
  const top = [...sorted].sort((a, b) => b.score - a.score).slice(0, 2).map(x => `${x.name} (${x.score})`);
  const bottom = [...sorted].sort((a, b) => a.score - b.score).slice(0, 2).map(x => `${x.name} (${x.score})`);
  const subj = metadata?.subject || 'the subject';
  const grade = metadata?.grade || 'the grade level';
  return `Celebrating strengths in ${top.join(' and ')}. Prioritize growth in ${bottom.join(' and ')}. Keep coaching moves tangible and student-facing to lift engagement and clarity in ${subj} for ${grade}.`;
}

// Export types
export type { TemplateCriterion };
