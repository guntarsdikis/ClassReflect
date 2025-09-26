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
                  avoid: { type: 'array', items: { type: 'string' } },
                  context_anchor: { type: 'string' }
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
                  'avoid',
                  'context_anchor'
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
            },
            prioritized_criteria: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  criterion: { type: 'string' },
                  reason: { type: 'string' },
                  expected_gain: { type: 'string' }
                },
                required: ['criterion', 'reason', 'expected_gain']
              }
            },
            admin_notes: {
              type: 'object',
              additionalProperties: false,
              properties: {
                data_quality_flags: { type: 'array', items: { type: 'string' } },
                aggregation_ready: { type: 'boolean' }
              },
              required: ['data_quality_flags', 'aggregation_ready']
            }
          },
          // Include top-level properties in required under strict mode
          required: ['strengths', 'improvements', 'detailed_feedback', 'coaching_summary', 'next_lesson_plan', 'prioritized_criteria', 'admin_notes']
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

    // Build OpenAI-specific Universal Template-Aware Prompt (updated)
    const buildOpenAiCoachPrompt = () => {
      const lines: string[] = [];
      lines.push(
        'You are an expert instructional coach analyzing a classroom transcript using a dynamic evaluation template.',
        '',
        'PRIMARY GOAL',
        '- Provide constructive, motivational, evidence-based coaching feedback for the teacher.',
        '- This report is for growth, not punishment.',
        '- Numbers are for admin tracking; narrative must be teacher-facing and improvement-focused.',
        '',
        'STYLE',
        '- Coaching voice: warm, specific, encouraging; use direct address (“You did…”, “Next time, consider…”).',
        '- Ground every claim in transcript evidence (quotes + timestamps).',
        '- For each criterion’s “feedback”, write 6 sentences (not fewer) and ≤120 words.',
        '- Avoid generic advice; always include a micro-action and an exemplar script.',
        '',
        'MOTIVATIONAL SCORING RUBRIC',
        '- 55–65 = Baseline / Absent but improvable → Give credit, explain one easy way to add it next lesson.',
        '- 66–75 = Emerging → Praise attempt, suggest refinement.',
        '- 76–85 = Developing → Present but inconsistent; provide a coaching move.',
        '- 86–92 = Strong → Consistently applied; celebrate and refine.',
        '- 93–100 = Exemplary → Best practice; affirm and encourage sharing.',
        '',
        'CONTEXT CALIBRATION (subject + grade)',
        '- Always interpret evidence in light of grade level and subject area.',
        '- Younger (K–5): prioritize engagement, routines, presence over formal academic language.',
        '- Middle/High (6–12): emphasize precision, academic vocabulary, independent participation.',
        '- Mathematics: Cold Call & Wait Time often mean short factual checks—focus on distribution, clarity, and error analysis rather than long responses.',
        '- Humanities/Language: emphasize elaboration, extended responses, textual evidence.',
        '- Do NOT penalize developmentally typical responses; offer age-appropriate improvements.',
        '',
        'TARGET ADJUSTMENT BY CONTEXT',
        '- If grade ≤2: treat “Format Matters—Complete Sentences” as emerging if students respond in words/phrases while teacher models stems; coach using brief sentence starters.',
        '- If grade ≤5: treat Wait Time target as 2–4s (instead of 3–5s); emphasize routines that prevent blurting and enable think time.',
        '- For “100%—Universal Participation” in K–5: interpret as on-task signals (eyes, hands, partner talk) rather than only verbal turns.',
        '- For Math: short, frequent checks are valid; focus coaching on distribution and clarity rather than response length.',
        '',
        'CLASS CONTEXT',
        '- Teacher: ' + classInfo.teacherName,
        '- Class: ' + classInfo.className,
        '- Subject: ' + classInfo.subject,
        '- Grade: ' + classInfo.grade,
        '' ,
        'EVALUATION TEMPLATE (dynamic)',
        'Template Name: ' + templateName,
        'Criteria (with weights and definitions):'
      );
      criterions.forEach(c => {
        const weight = typeof (c as any).weight === 'number' ? (c as any).weight : Number((c as any).weight);
        const weightStr = Number.isFinite(weight) ? weight.toFixed(2) : String(weight || '0');
        lines.push(`- ${c.criteria_name} (${weightStr}%): ${c.prompt_template || `Evaluate the teacher's ${c.criteria_name.toLowerCase()}`}`);
      });
      lines.push('', 'CRITERIA TO ANALYZE (template-linked)',
        '- Use ONLY the criteria listed above (no additions/substitutions).',
        '- In “detailed_feedback”, create one object per criterion using the EXACT criterion names (same spelling, hyphens, capitalization).',
        '- If the template supplies weights/definitions, use them to interpret evidence and coach next steps.',
        '',
        'SHORT/QUIET SEGMENTS RULE',
        '- If the transcript provides limited dialogue for a criterion, write “Limited evidence due to transcript context” and suggest one change that would produce evidence next time (e.g., “Insert 3 cold calls in the next 10 minutes”).',
        '',
        'LENGTH & CONSISTENCY RULES',
        '- “feedback” = exactly 6 sentences (≥6), ≤120 words.',
        '- Max 2 short quotes per criterion.',
        '- Do not omit or rename fields; keep key names exactly as specified.',
        '- If a required number is unknown, write “unknown” and still provide next_step_teacher_move + exemplar.',
        '',
        'IMPORTANT',
        '- Do NOT include any overall/total score in JSON or narrative; if generated, remove it.',
        '- Use criterion names exactly as in the template (including punctuation).',
        '- Choose at most 2 “prioritized_criteria” (one quick win + one deeper skill).',
        '- If evidence is missing, use Baseline scoring (55–65), write “No transcript evidence available” or “Limited evidence due to transcript context,” and still provide a micro-action + exemplar.'
      );
      // Data to use (pause metrics if available)
      if (opts?.pauseMetrics) {
        const pm = opts.pauseMetrics;
        const fmt = (n: number, d = 2) => Number.isFinite(n) ? Number(n).toFixed(d) : String(n);
        lines.push('WAIT-TIME METRICS (provided)',
          `- Lesson span: ${fmt(pm.totalDurationSeconds)}s; Speech: ${fmt(pm.totalSpeechSeconds)}s; Silence: ${fmt(pm.totalSilenceSeconds)}s (${fmt(pm.silencePercentage)}%)`,
          `- Avg pause: ${fmt(pm.averageSilenceSeconds)}s; Median: ${fmt(pm.medianSilenceSeconds)}s; p90: ${fmt(pm.p90SilenceSeconds)}s; Long (≥${fmt(pm.longSilenceThresholdSeconds, 0)}s): ${pm.longSilenceCount}; Longest: ${fmt(pm.longestSilenceSeconds)}s`,
          'Use these to support the Wait Time criterion.',
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
          '      "feedback": "6 sentences (≤120 words): strength; evidence quote+timestamp; gap; why it matters; immediate next step; vision (include explicit subject+grade)",',
          '      "evidence_excerpt": ["short quote 1","short quote 2 (optional)"],',
          '      "evidence_timestamp": ["[mm:ss]","[mm:ss] (optional)"],',
          '      "observed_vs_target": "e.g., Cold Calls: 3 vs 8–12 (weight 7%); or Wait Time: avg 1.02s vs 2–4s (K–2 adjusted)",',
          '      "next_step_teacher_move": "one precise micro-action",',
          '      "vision_of_better_practice": "1–2 sentence improvement vision",',
          '      "exemplar": "≤25-word teacher script",',
          '      "look_fors": ["observable #1","observable #2"],',
          '      "avoid": ["pitfall #1"],',
          '      "context_anchor": "how subject + grade shaped scoring/advice"',
          '    }',
          '  },',
          '  "coaching_summary": "2–3 upbeat paragraphs: celebrate 2–3 wins; set 1–2 growth priorities; connect to student outcomes; explicitly reference subject + grade.",',
          '  "next_lesson_plan": {',
          '    "focus_priorities": ["Priority 1","Priority 2"],',
          '    "10_min_practice_block": ["Minute 0–3: …","Minute 3–6: …","Minute 6–10: …"],',
          '    "success_metrics": ["Metric 1 with target","Metric 2 with target"]',
          '  },',
          '  "prioritized_criteria": [',
          '    {"criterion": "<name>", "reason": "largest impact / easiest win", "expected_gain": "student-facing improvement"},',
          '    {"criterion": "<name>", "reason": "second priority", "expected_gain": "…"}',
          '  ],',
          '  "admin_notes": {',
          '    "data_quality_flags": ["e.g., short transcript","few questions","speaker labels missing"],',
          '    "aggregation_ready": true',
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
