import axios from 'axios';
import { lemurService, type TemplateCriterion } from './lemur';
import type { PauseMetrics } from './pauseMetrics';

export class OpenAIProvider {
  private model: string;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  private getApiKey(): string {
    // Read API key fresh from environment on each request
    const raw = process.env.OPENAI_API_KEY || '';
    // Sanitize: remove ALL whitespace characters from the key value
    // (keys never legitimately contain spaces/tabs/newlines)
    const sanitized = raw.replace(/\s+/g, '');
    if (raw && sanitized !== raw) {
      console.warn('⚠️ OPENAI_API_KEY contained whitespace and was sanitized. Please fix your environment to avoid 401s.');
    }
    return sanitized;
  }

  getDefaultModel() {
    return this.model;
  }

  private getTimeoutMs(): number {
    const raw = process.env.OPENAI_TIMEOUT_MS || '300000'; // 5 minutes default
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) {
      return Math.max(60000, Math.min(n, 600000));
    }
    return 300000;
  }

  private getMaxTokens(model: string): number | undefined {
    // Allow overriding; keep conservative default to reduce latency
    const raw = process.env.OPENAI_MAX_TOKENS;
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) return Math.max(256, Math.min(n, 8000));
    }
    // Reasonable default caps; adjust per model family if needed
    if ((model || '').includes('gpt-4o')) return 4000;
    return 2000;
  }

  private getResponseFormat(): { type: 'json_object' } | { type: 'json_schema'; json_schema: any } {
    const mode = (process.env.OPENAI_RESPONSE_FORMAT || 'json_object').toLowerCase();
    if (mode === 'json_schema') {
      const schema = {
        name: 'analysis_schema',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            detailed_feedback: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  score: { type: 'number' },
                  feedback: { type: 'string' },
                  evidence_excerpt: { type: 'array', items: { type: 'string' } },
                  evidence_timestamp: { type: 'array', items: { type: 'string' } },
                  observed_vs_target: { type: 'string' },
                  next_step_teacher_move: { type: 'string' },
                  vision_of_better_practice: { type: 'string' },
                  exemplar: { type: 'string' },
                  look_fors: { type: 'array', items: { type: 'string' } },
                  avoid: { type: 'array', items: { type: 'string' } }
                },
                // OpenAI strict schema requires 'required' to include every key listed in properties
                required: [
                  'score',
                  'feedback',
                  'evidence_excerpt',
                  'evidence_timestamp',
                  'observed_vs_target',
                  'next_step_teacher_move',
                  'vision_of_better_practice',
                  'exemplar',
                  'look_fors',
                  'avoid'
                ]
              }
            },
            coaching_summary: { type: 'string' },
            next_lesson_plan: {
              type: 'object',
              additionalProperties: false,
              properties: {
                focus_priorities: { type: 'array', items: { type: 'string' } },
                '10_min_practice_block': { type: 'array', items: { type: 'string' } },
                success_metrics: { type: 'array', items: { type: 'string' } }
              },
              required: ['focus_priorities', '10_min_practice_block', 'success_metrics']
            }
          },
          // Include top-level properties in required under strict mode
          required: ['strengths', 'improvements', 'detailed_feedback', 'coaching_summary', 'next_lesson_plan']
        }
      };
      return { type: 'json_schema', json_schema: schema } as any;
    }
    return { type: 'json_object' } as const;
  }

  private safeParseJson(content: string): any {
    const tryParse = (s: string) => {
      try { return JSON.parse(s); } catch { return undefined; }
    };

    let parsed = tryParse(content);
    if (parsed !== undefined) return parsed;

    // Strip surrounding code fences if present
    let s = content.trim();
    if (s.startsWith('```json')) {
      s = s.replace(/^```json\s*/i, '');
      s = s.replace(/\s*```$/i, '');
    } else if (s.startsWith('```')) {
      s = s.replace(/^```\s*/i, '');
      s = s.replace(/\s*```$/i, '');
    }
    parsed = tryParse(s);
    if (parsed !== undefined) return parsed;

    // Attempt to extract the largest JSON object substring
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const slice = s.slice(first, last + 1);
      parsed = tryParse(slice);
      if (parsed !== undefined) return parsed;
    }

    // As a last resort, throw with a short snippet for debugging
    const snippet = s.slice(0, 500);
    throw new SyntaxError('Failed to parse JSON response. Snippet: ' + snippet);
  }

  async analyzeWithTemplate(
    transcriptText: string,
    templateName: string,
    criterions: TemplateCriterion[],
    classInfo: {
      className: string;
      subject: string;
      grade: string;
      teacherName: string;
    },
    opts?: { model?: string; pauseMetrics?: PauseMetrics | null; timingContext?: string }
  ): Promise<{
    overall_score: number;
    strengths: string[];
    improvements: string[];
    detailed_feedback: Record<string, { score: number; feedback: string }>;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      const message = 'OpenAI API key not configured; cannot run analysis.';
      console.error(`❌ ${message}`);
      throw new Error(message);
    }

    // Build OpenAI-specific coaching prompt (full)
    const buildOpenAiCoachPrompt = () => {
      const lines: string[] = [];
      lines.push(
        'You are an expert instructional coach analyzing a classroom transcript using the "' + templateName + ' – Complete Framework."',
        '',
        'PRIMARY GOAL:',
        '- Help the teacher improve practice through constructive, evidence-based, and motivational feedback.',
        '- Reports should motivate, not punish.',
        '- Numbers exist for admin tracking, but narrative feedback must always be teacher-facing and coaching-focused.',
        '',
        'STYLE:',
        '- Coaching voice: warm, specific, and encouraging.',
        '- Use direct address where possible (“You did…”, “Next time, consider…”).',
        '- Always ground observations in transcript evidence (quotes + timestamps).',
        '- Write in 4–6 sentence paragraphs for feedback; do not compress into 1–2 sentences.',
        '',
        '---',
        '',
        'MOTIVATIONAL SCORING RUBRIC:',
        '- 55–65 = Baseline / Absent but improvable → Give credit, explain one easy way to add it next lesson.',
        '- 66–75 = Emerging → Praise attempt, suggest refinement.',
        '- 76–85 = Developing → Present but inconsistent; provide a coaching move.',
        '- 86–92 = Strong → Consistently applied; celebrate and refine.',
        '- 93–100 = Exemplary → Best practice; affirm and encourage sharing.',
        '',
        '---',
        '',
        'PER-CRITERION REQUIREMENTS (apply to EVERY criterion below):',
        '',
        'Each criterion in `detailed_feedback` must include:',
        '',
        '1. score (0–100, motivational rubric)',
        '2. feedback (5–7 sentences minimum, covering in order):',
        '   - one concrete strength observed (positive framing)',
        '   - one direct quote + timestamp as evidence',
        '   - what the teacher did that limited the technique (gap)',
        '   - why this gap matters for student learning',
        '   - one actionable next step the teacher can try immediately',
        '   - a short "vision of better practice" (what the class would look/feel like if improved)',
        '   - if possible, provide a model teacher script or routine',
        '3. evidence_excerpt: 1–2 short quotes from transcript',
        '4. evidence_timestamp: [mm:ss] for each excerpt',
        '5. observed_vs_target: quantified comparison (e.g., “3 cold calls vs. target 8–12”)',
        '6. next_step_teacher_move: one precise micro-action (e.g., “After asking a question, silently count to 5”)',
        '7. vision_of_better_practice: 1–2 sentences describing how the classroom improves if this is implemented',
        '8. exemplar: ≤25-word teacher script or routine (model phrasing)',
        '9. look_fors: 2–3 observable behaviors to check progress next time',
        '10. avoid: 1–2 pitfalls to watch out for',
        '',
        'IF NO EVIDENCE:',
        '- Still include the criterion.',
        '- Score 55–65.',
        '- Write “No transcript evidence available” in evidence_excerpt.',
        '- Still provide next_step_teacher_move, exemplar, and look_fors.',
        '',
        '---',
        '',
        'CLASS CONTEXT:',
        '- Teacher: ' + classInfo.teacherName,
        '- Class: ' + classInfo.className,
        '- Subject: ' + classInfo.subject,
        '- Grade: ' + classInfo.grade,
        '',
        'CRITERIA (include ALL, do not omit):'
      );
      // List criterion names exactly
      criterions.forEach(c => {
        lines.push('- ' + c.criteria_name);
      });
      lines.push('', '---', '');
      // Data to use (pause metrics if available)
      if (opts?.pauseMetrics) {
        const pm = opts.pauseMetrics;
        const fmt = (n: number, d = 2) => Number.isFinite(n) ? Number(n).toFixed(d) : String(n);
        lines.push('DATA TO USE:',
          `- Wait-time metrics: avg ${fmt(pm.averageSilenceSeconds)}, median ${fmt(pm.medianSilenceSeconds)}, p90 ${fmt(pm.p90SilenceSeconds)}, long pauses ≥${fmt(pm.longSilenceThresholdSeconds, 0)}s: ${pm.longSilenceCount}, longest = ${fmt(pm.longestSilenceSeconds)}s. Use these for observed_vs_target.`,
          '- Always pull at least one transcript quote per criterion, or mark “No transcript evidence available.”',
          '',
          'DO NOT:',
          '- Do not calculate an overall score.',
          '- Do not omit any criterion.',
          '- Do not output generic suggestions; every suggestion must include an exemplar script + look-fors.',
          '',
          '---',
          '',
          'OUTPUT REQUIREMENT (return ONE JSON object exactly):',
          '{',
          '  "strengths": ["strength1", "strength2", ...],',
          '  "improvements": ["improvement1", "improvement2", ...],',
          '  "detailed_feedback": {',
          '    "<criterion_name>": {',
          '      "score": number,',
          '      "feedback": "5–7 sentences minimum covering: strength; evidence quote+timestamp; gap; why it matters; immediate next step; vision of better practice; model teacher script/routine if possible",',
          '      "evidence_excerpt": ["short quote 1","short quote 2 (optional)"],',
          '      "evidence_timestamp": ["[mm:ss]","[mm:ss] (optional)"],',
          '      "observed_vs_target": "quantified comparison",',
          '      "next_step_teacher_move": "precise micro-action",',
          '      "vision_of_better_practice": "1–2 sentence improvement vision",',
          '      "exemplar": "≤25-word teacher script",',
          '      "look_fors": ["observable #1","observable #2"],',
          '      "avoid": ["pitfall #1"]',
          '    }',
          '  },',
          '  "coaching_summary": "2–3 upbeat paragraphs: celebrate 2–3 wins, set 1–2 growth priorities, explain how these will improve student learning.",',
          '  "next_lesson_plan": {',
          '    "focus_priorities": ["Priority 1","Priority 2"],',
          '    "10_min_practice_block": ["Minute 0–3: …","Minute 3–6: …","Minute 6–10: …"],',
          '    "success_metrics": ["Metric 1 with target","Metric 2 with target"]',
          '  }',
          '}',
          ''
        );
      }
      return lines.join('\n');
    };

    const userContent = `${buildOpenAiCoachPrompt()}\n\nTRANSCRIPT (plain text):\n${transcriptText}`;

    const authHeader = `Bearer ${apiKey}`;
    const primaryModel = opts?.model || this.model;
    const timeoutMs = this.getTimeoutMs();
    const doCall = async (modelToUse: string, overrideFormat?: any) => axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: modelToUse,
        messages: [
          { role: 'system', content: 'You are an expert educational consultant.' },
          { role: 'user', content: userContent }
        ],
        response_format: overrideFormat || this.getResponseFormat(),
        ...(this.getMaxTokens(modelToUse) ? { max_tokens: this.getMaxTokens(modelToUse) } : {}),
        // Don't set temperature for gpt-4o - it only supports default (1)
        ...(!(modelToUse).includes('gpt-4o') && { temperature: 0.1 })
      },
      {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        timeout: timeoutMs
      }
    );

    try {
      console.log('🧠 OpenAI request:', {
        model: primaryModel,
        transcriptChars: transcriptText?.length || 0,
        criteriaCount: criterions.length,
        promptChars: userContent.length,
        pauseMetrics: !!opts?.pauseMetrics,
        timeoutMs,
        maxTokens: this.getMaxTokens(primaryModel)
      });
      const response = await doCall(primaryModel);
      const content = response.data?.choices?.[0]?.message?.content || '{}';
      const analysisResult = this.safeParseJson(content);
      const overallScore = lemurService.calculateWeightedScore(analysisResult.detailed_feedback, criterions, { silentMissing: true });
      analysisResult.overall_score = overallScore;
      return analysisResult;
    } catch (error: any) {
      const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
      console.error('❌ OpenAI analysis error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      if (error?.response?.status === 401) {
        console.warn('🔐 Hint: Check OPENAI_API_KEY (no spaces/newlines) and which environment is supplying it (OS env can override .env).');
      }
      // If server rejects our response_format schema, fall back to json_object
      const isSchemaError = error?.response?.status === 400 && (error?.response?.data?.error?.param === 'response_format' || /response_format/i.test(error?.response?.data?.error?.message || ''));
      if (isSchemaError) {
        try {
          console.warn('🧩 response_format schema rejected by OpenAI. Falling back to json_object and retrying...');
          const response = await doCall(primaryModel, { type: 'json_object' });
          const content = response.data?.choices?.[0]?.message?.content || '{}';
          const analysisResult = this.safeParseJson(content);
          const overallScore = lemurService.calculateWeightedScore(analysisResult.detailed_feedback, criterions, { silentMissing: true });
          analysisResult.overall_score = overallScore;
          return analysisResult;
        } catch (e) {
          console.warn('Fallback to json_object also failed:', (e as any)?.message || e);
        }
      }
      // Retry strategy for parse errors (malformed JSON): force strict json_schema
      const isParseError = error instanceof SyntaxError || /Failed to parse JSON/i.test(error?.message || '');
      if (isParseError) {
        try {
          console.warn('🛠️ Retrying OpenAI call with strict json_schema to enforce valid JSON...');
          const response = await doCall(primaryModel, this.getResponseFormat());
          const content = response.data?.choices?.[0]?.message?.content || '{}';
          const analysisResult = this.safeParseJson(content);
          const overallScore = lemurService.calculateWeightedScore(analysisResult.detailed_feedback, criterions);
          analysisResult.overall_score = overallScore;
          return analysisResult;
        } catch (e) {
          console.warn('🛠️ Strict schema retry failed. Will consider model fallback if applicable. Error:', (e as any)?.message || e);
        }
      }
      if (isTimeout && primaryModel.includes('gpt-4o') && !primaryModel.includes('mini')) {
        const fallback = 'gpt-4o-mini';
        console.warn(`⏱️ OpenAI timeout with ${primaryModel}. Retrying once with ${fallback}...`);
        const response = await doCall(fallback);
        const content = response.data?.choices?.[0]?.message?.content || '{}';
        const analysisResult = this.safeParseJson(content);
        const overallScore = lemurService.calculateWeightedScore(analysisResult.detailed_feedback, criterions, { silentMissing: true });
        analysisResult.overall_score = overallScore;
        return analysisResult;
      }
      throw error;
    }
  }
}

export const openaiProvider = new OpenAIProvider();
