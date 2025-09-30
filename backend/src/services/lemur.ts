import axios from 'axios';
import type { PauseMetrics } from './pauseMetrics';
import { promptManager, type PromptVariables } from './promptManager';

export interface LemurTaskRequest {
  prompt: string;
  final_model: string;
  transcript_ids?: string[];
  input_text?: string;
  max_output_size?: number;
  temperature?: number;
}

export interface LemurTaskResponse {
  request_id: string;
  response: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface TemplateCriterion {
  criteria_name: string;
  weight: number;
  prompt_template?: string;
}

export class LemurService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY || '';
    this.baseUrl = 'https://api.assemblyai.com';

    if (!this.apiKey) {
      console.warn('AssemblyAI API key not found. AI analysis will use mock data.');
    }
  }

  private getMaxOutputSize(): number {
    const raw = process.env.LEMUR_MAX_OUTPUT_SIZE || '9000';
    const n = parseInt(raw, 10);
    // Clamp to a reasonable range to avoid API rejections
    if (Number.isFinite(n)) {
      return Math.max(2000, Math.min(n, 16000));
    }
    return 9000;
  }

  /**
   * Build analysis prompt from template criterions
   */
  async buildAnalysisPrompt(
    templateName: string,
    criterions: TemplateCriterion[],
    classInfo: {
      className: string;
      subject: string;
      grade: string;
      teacherName: string;
    },
    options?: { pauseMetrics?: PauseMetrics | null; timingContext?: string; templateId?: number }
  ): Promise<string> {
    const formatNumber = (value: number, decimals = 2) => Number.isFinite(value) ? value.toFixed(decimals) : '0.00';

    // Try to get prompt from database
    // First check if template has a specific prompt assigned
    let dbPrompt = null;
    if (options?.templateId) {
      dbPrompt = await promptManager.getTemplatePrompt(options.templateId, 'lemur');
      if (dbPrompt) {
        console.log(`📝 Using template-specific prompt version ${dbPrompt.version} (template ${options.templateId})`);
      }
    }

    // If no template-specific prompt, get the active default
    if (!dbPrompt) {
      dbPrompt = await promptManager.getActivePrompt('lemur', 'analysis_prompt');
      if (dbPrompt) {
        console.log(`📝 Using default active prompt version ${dbPrompt.version}`);
      }
    }

    // If we have a database prompt, use it with variable replacement
    if (dbPrompt) {
      const variables: PromptVariables = {
        // Individual variables that match the database template
        TEACHER_NAME: classInfo.teacherName,
        CLASS_NAME: classInfo.className,
        SUBJECT: classInfo.subject,
        GRADE: classInfo.grade,

        TEMPLATE_NAME: templateName,
        CRITERIA_LIST: criterions.map(c => `- ${c.criteria_name} (${Number(c.weight).toFixed(2)}%): ${c.prompt_template || `Evaluate the teacher's ${c.criteria_name.toLowerCase()}`}`).join('\n'),

        WAIT_TIME_METRICS: options?.pauseMetrics ? `WAIT-TIME METRICS (provided)
- Lesson span: ${formatNumber(options.pauseMetrics.totalDurationSeconds)}s; Speech: ${formatNumber(options.pauseMetrics.totalSpeechSeconds)}s; Silence: ${formatNumber(options.pauseMetrics.totalSilenceSeconds)}s (${formatNumber(options.pauseMetrics.silencePercentage)}%)
- Avg pause: ${formatNumber(options.pauseMetrics.averageSilenceSeconds)}s; Median: ${formatNumber(options.pauseMetrics.medianSilenceSeconds)}s; p90: ${formatNumber(options.pauseMetrics.p90SilenceSeconds)}s; Long (≥${formatNumber(options.pauseMetrics.longSilenceThresholdSeconds, 0)}s): ${options.pauseMetrics.longSilenceCount}; Longest: ${formatNumber(options.pauseMetrics.longestSilenceSeconds)}s
Use these to support the Wait Time criterion.` : '',

        TIMING_SECTION: options?.timingContext ? `

TIME-CODED EVIDENCE (selected excerpts):
${options.timingContext}` : ''
      };

      return promptManager.replaceTemplateVariables(dbPrompt.prompt_template, variables);
    }

    // Fall back to original hardcoded prompt
    console.log('📝 Using hardcoded prompt (no database prompt found)');

    const timingSection = options?.timingContext ? `\n\nTIME-CODED EVIDENCE (selected excerpts):\n${options.timingContext}` : '';

    return `
You are an expert instructional coach analyzing a classroom transcript using a dynamic evaluation template.

PRIMARY GOAL
- Provide constructive, motivational, evidence-based coaching feedback for the teacher.
- This report is for growth, not punishment.
- Numbers are for admin tracking; narrative must be teacher-facing and improvement-focused.

STYLE
- Coaching voice: warm, specific, encouraging; use direct address ("You did…", "Next time, consider…").
- Ground every claim in transcript evidence (quotes + timestamps).
- For each criterion's "feedback", write 6 sentences (not fewer) and ≤120 words.
- Avoid generic advice; always include a micro-action and an exemplar script.

MOTIVATIONAL SCORING RUBRIC
- 55–65 = Baseline / Absent but improvable → Give credit, explain one easy way to add it next lesson.
- 66–75 = Emerging → Praise attempt, suggest refinement.
- 76–85 = Developing → Present but inconsistent; provide a coaching move.
- 86–92 = Strong → Consistently applied; celebrate and refine.
- 93–100 = Exemplary → Best practice; affirm and encourage sharing.

CONTEXT CALIBRATION (subject + grade)
- Always interpret evidence in light of grade level and subject area.
- Younger (K–5): prioritize engagement, routines, presence over formal academic language.
- Middle/High (6–12): emphasize precision, academic vocabulary, independent participation.
- Mathematics: Cold Call & Wait Time often mean short factual checks—focus on distribution, clarity, and error analysis rather than long responses.
- Humanities/Language: emphasize elaboration, extended responses, textual evidence.
- Do NOT penalize developmentally typical responses; offer age-appropriate improvements.

TARGET ADJUSTMENT BY CONTEXT
- If grade ≤2: treat "Format Matters—Complete Sentences" as emerging if students respond in words/phrases while teacher models stems; coach using brief sentence starters.
- If grade ≤5: treat Wait Time target as 2–4s (instead of 3–5s); emphasize routines that prevent blurting and enable think time.
- For "100%—Universal Participation" in K–5: interpret as on-task signals (eyes, hands, partner talk) rather than only verbal turns.
- For Math: short, frequent checks are valid; focus coaching on distribution and clarity rather than response length.

CLASS CONTEXT
- Teacher: ${classInfo.teacherName}
- Class: ${classInfo.className}
- Subject: ${classInfo.subject}
- Grade: ${classInfo.grade}

${options?.pauseMetrics ? `WAIT-TIME METRICS (provided)
- Lesson span: ${formatNumber(options.pauseMetrics.totalDurationSeconds)}s; Speech: ${formatNumber(options.pauseMetrics.totalSpeechSeconds)}s; Silence: ${formatNumber(options.pauseMetrics.totalSilenceSeconds)}s (${formatNumber(options.pauseMetrics.silencePercentage)}%)
- Avg pause: ${formatNumber(options.pauseMetrics.averageSilenceSeconds)}s; Median: ${formatNumber(options.pauseMetrics.medianSilenceSeconds)}s; p90: ${formatNumber(options.pauseMetrics.p90SilenceSeconds)}s; Long (≥${formatNumber(options.pauseMetrics.longSilenceThresholdSeconds, 0)}s): ${options.pauseMetrics.longSilenceCount}; Longest: ${formatNumber(options.pauseMetrics.longestSilenceSeconds)}s
Use these to support the Wait Time criterion.` : ''}
${timingSection}

EVALUATION TEMPLATE (dynamic)
Template Name: ${templateName}
Criteria (with weights and definitions):
${criterions.map(c => `- ${c.criteria_name} (${Number(c.weight).toFixed(2)}%): ${c.prompt_template || `Evaluate the teacher's ${c.criteria_name.toLowerCase()}`}`).join('\n')}

CRITERIA TO ANALYZE (template-linked)
- Use ONLY the criteria listed above (no additions/substitutions).
- In "detailed_feedback", create one object per criterion using the EXACT criterion names (same spelling, hyphens, capitalization).
- If the template supplies weights/definitions, use them to interpret evidence and coach next steps.

SHORT/QUIET SEGMENTS RULE
- If the transcript provides limited dialogue for a criterion, write "Limited evidence due to transcript context" and suggest one change that would produce evidence next time (e.g., "Insert 3 cold calls in the next 10 minutes").

LENGTH & CONSISTENCY RULES
- "feedback" = exactly 6 sentences (≥6), ≤120 words.
- Max 2 short quotes per criterion.
- Do not omit or rename fields; keep key names exactly as specified.
- If a required number is unknown, write "unknown" and still provide next_step_teacher_move + exemplar.

IMPORTANT
- Do NOT calculate an overall/total score in the JSON or narrative; if generated, remove it.
- Use criterion names exactly as in the template (including punctuation).
- Choose at most 2 "prioritized_criteria" (one quick win + one deeper skill).
- If evidence is missing, use Baseline scoring (55–65), write "No transcript evidence available" or "Limited evidence due to transcript context," and still provide a micro-action + exemplar.

OUTPUT REQUIREMENT (return ONE JSON object exactly)
{
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "detailed_feedback": {
    "<criterion_name>": {
      "score": number,  // 0–100 per motivational rubric, context-calibrated
      "feedback": "6 sentences: strength; evidence quote+timestamp; gap; why it matters; immediate next step; vision (explicit subject+grade mention)",
      "evidence_excerpt": ["short quote 1","short quote 2 (optional)"] ,
      "evidence_timestamp": ["[mm:ss]","[mm:ss] (optional)"],
      "observed_vs_target": "e.g., Cold Calls: 3 vs 8–12 (weight 7%); or Wait Time: avg 1.02s vs 2–4s (K–2 adjusted)",
      "next_step_teacher_move": "one precise micro-action",
      "vision_of_better_practice": "1–2 sentence improvement vision",
      "exemplar": "≤25-word teacher script/routine",
      "look_fors": ["observable #1","observable #2"],
      "avoid": ["pitfall #1"],
      "context_anchor": "how subject + grade shaped scoring/advice"
    }
    // ... repeat for EVERY criterion in the template
  },
  "coaching_summary": "2–3 upbeat paragraphs: celebrate 2–3 wins; set 1–2 growth priorities; connect to student outcomes; explicitly reference subject + grade.",
  "next_lesson_plan": {
    "focus_priorities": ["Priority 1","Priority 2"], // choose at most 2
    "10_min_practice_block": [
      "Minute 0–3: …",
      "Minute 3–6: …",
      "Minute 6–10: …"
    ],
    "success_metrics": ["Metric 1 with target","Metric 2 with target"] // quantifiable
  },
  "prioritized_criteria": [
    {"criterion": "<name>", "reason": "largest impact / easiest win", "expected_gain": "student-facing improvement"},
    {"criterion": "<name>", "reason": "second priority", "expected_gain": "…"}
  ],
  "admin_notes": {
    "data_quality_flags": ["e.g., short transcript","few questions","speaker labels missing"],
    "aggregation_ready": true
  }
}
    `.trim();
  }

  /**
   * Analyze transcript using template criterions via LeMUR
   */
  async analyzeWithTemplate(
    transcriptId: string,
    templateName: string,
    criterions: TemplateCriterion[],
    classInfo: {
      className: string;
      subject: string;
      grade: string;
      teacherName: string;
    },
    options?: { pauseMetrics?: PauseMetrics | null; timingContext?: string; templateId?: number }
  ): Promise<{
    overall_score: number;
    strengths: string[];
    improvements: string[];
    detailed_feedback: Record<string, { score: number; feedback: string }>;
  }> {
    if (!this.apiKey) {
      const message = 'AssemblyAI API key not configured; cannot run LeMUR analysis.';
      console.error(`❌ ${message}`);
      throw new Error(message);
    }

    try {
      const prompt = await this.buildAnalysisPrompt(templateName, criterions, classInfo, {
        pauseMetrics: options?.pauseMetrics,
        timingContext: options?.timingContext,
        templateId: options?.templateId
      });

      console.log('🧠 LeMUR request prepared:', {
        transcriptId,
        templateName,
        criteriaCount: criterions.length,
        pauseMetrics: !!options?.pauseMetrics,
        promptChars: prompt.length,
        model: 'anthropic/claude-sonnet-4-20250514'
      });

      let maxOutput = this.getMaxOutputSize();
      const makeRequestBody = (mos: number): LemurTaskRequest => ({
        prompt,
        final_model: 'anthropic/claude-sonnet-4-20250514',
        transcript_ids: [transcriptId],
        max_output_size: mos,
        temperature: 0.1
      });

      const doCall = async (mos: number) => axios.post<LemurTaskResponse>(
        `${this.baseUrl}/lemur/v3/generate/task`,
        makeRequestBody(mos),
        { headers: { 'Authorization': this.apiKey, 'Content-Type': 'application/json' } }
      );

      let response: { data: LemurTaskResponse };
      try {
        response = await doCall(maxOutput);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || '';
        if (String(msg).toLowerCase().includes('max_output_size') || String(msg).toLowerCase().includes('too small')) {
          // Retry once with a larger cap
          const bumped = Math.min(maxOutput * 2, 16000);
          console.warn(`LeMUR max_output_size=${maxOutput} too small; retrying with ${bumped}`);
          response = await doCall(bumped);
        } else {
          throw err;
        }
      }

      // Parse the JSON response (clean up markdown code blocks if present)
      try {
        let jsonResponse = response.data.response.trim();

        // Remove markdown code blocks if present
        if (jsonResponse.startsWith('```json')) {
          jsonResponse = jsonResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonResponse.startsWith('```')) {
          jsonResponse = jsonResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const analysisResult = JSON.parse(jsonResponse);

        // Calculate weighted average overall score
        const overallScore = this.calculateWeightedScore(analysisResult.detailed_feedback, criterions, { silentMissing: true });

        // Add the calculated overall score to the result
        analysisResult.overall_score = overallScore;

        console.log('✅ AssemblyAI LeMUR analysis completed:', {
          requestId: response.data.request_id,
          inputTokens: response.data.usage.input_tokens,
          outputTokens: response.data.usage.output_tokens,
          overallScore: overallScore,
          calculatedFromWeights: true
        });

        return analysisResult;
      } catch (parseError) {
        console.error('❌ Failed to parse LeMUR response as JSON:', parseError);
        console.log('Raw response:', response.data.response);
        throw new Error('Failed to parse LeMUR response as JSON');
      }
    } catch (error: any) {
      console.error('❌ AssemblyAI LeMUR API error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Calculate weighted average score from individual criterion scores
   */
  public calculateWeightedScore(
    detailedFeedback: Record<string, { score: number; feedback: string }>,
    criterions: TemplateCriterion[],
    options?: { silentMissing?: boolean }
  ): number {
    // Normalize key helper to make name matching resilient to small variations
    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    // Build a normalized lookup from returned feedback
    const feedbackMap: Record<string, { score: number; feedback: string } | undefined> = {};
    Object.entries(detailedFeedback || {}).forEach(([key, value]) => {
      const normKey = normalize(key);
      feedbackMap[normKey] = value as any;
    });

    let weightedSum = 0;
    let totalWeight = 0;
    const collectedScores: number[] = [];

    criterions.forEach(criterion => {
      const normCrit = normalize(criterion.criteria_name);
      const feedback = detailedFeedback[criterion.criteria_name] ?? feedbackMap[normCrit];
      if (feedback && (feedback as any).score !== undefined) {
        // Coerce score to number safely (handles strings like "85" or "85%")
        const rawScore = (feedback as any).score;
        const scoreNum = typeof rawScore === 'number'
          ? rawScore
          : Number(String(rawScore).replace(/%/g, '').trim());

        // Coerce weight to number (mysql DECIMAL often returns strings)
        const weightNum = typeof (criterion as any).weight === 'number'
          ? (criterion as any).weight
          : Number((criterion as any).weight);

        if (!Number.isNaN(scoreNum) && !Number.isNaN(weightNum) && weightNum > 0) {
          weightedSum += scoreNum * weightNum;
          totalWeight += weightNum;
          collectedScores.push(scoreNum);
        } else {
          console.warn(`⚠️ Invalid score/weight for criterion "${criterion.criteria_name}":`, { rawScore, weight: criterion.weight });
        }
      } else {
        if (!options?.silentMissing) {
          console.warn(`⚠️ Missing score for criterion: ${criterion.criteria_name}`);
        }
      }
    });

    // Primary: weighted average if we have valid weights
    if (totalWeight > 0) {
      const overallScore = weightedSum / totalWeight;
      return Math.round(overallScore * 100) / 100;
    }

    // Fallback: simple average if no weights resolved but we did collect numbers
    if (collectedScores.length > 0) {
      const avg = collectedScores.reduce((a, b) => a + b, 0) / collectedScores.length;
      return Math.round(avg * 100) / 100;
    }

    // No usable scores
    return 0;
  }

}

export const lemurService = new LemurService();
