import axios from 'axios';
import type { PauseMetrics } from './pauseMetrics';

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
  buildAnalysisPrompt(
    templateName: string,
    criterions: TemplateCriterion[],
    classInfo: {
      className: string;
      subject: string;
      grade: string;
      teacherName: string;
    },
    options?: { pauseMetrics?: PauseMetrics | null; timingContext?: string }
  ): string {
    const criteriaDescriptions = criterions.map(criterion => 
      `- ${criterion.criteria_name} (${criterion.weight}% weight): ${criterion.prompt_template || `Evaluate the teacher's ${criterion.criteria_name.toLowerCase()}`}`
    ).join('\n');

    const formatNumber = (value: number, decimals = 2) => Number.isFinite(value) ? value.toFixed(decimals) : '0.00';

    const pauseMetricsSection = options?.pauseMetrics ? `

WAIT TIME METRICS (from transcript timing data):
- Total lesson span (first to last spoken word): ${formatNumber(options.pauseMetrics.totalDurationSeconds)} seconds
- Speaking time detected: ${formatNumber(options.pauseMetrics.totalSpeechSeconds)} seconds
- Silence between utterances: ${formatNumber(options.pauseMetrics.totalSilenceSeconds)} seconds (${formatNumber(options.pauseMetrics.silencePercentage)}% of lesson span)
- Average pause: ${formatNumber(options.pauseMetrics.averageSilenceSeconds)} seconds (median ${formatNumber(options.pauseMetrics.medianSilenceSeconds)}s, 90th percentile ${formatNumber(options.pauseMetrics.p90SilenceSeconds)}s)
- Long pauses (≥${formatNumber(options.pauseMetrics.longSilenceThresholdSeconds, 1)}s): ${options.pauseMetrics.longSilenceCount} occurrences (${formatNumber(options.pauseMetrics.longSilencePercentage)}% of pauses). Longest pause observed: ${formatNumber(options.pauseMetrics.longestSilenceSeconds)}s

Use these metrics to support your evaluation of wait time. Combine them with qualitative evidence from the transcript when scoring criteria.
`.trimEnd() : '';

    const timingSection = options?.timingContext ? `\n\nTIME-CODED EVIDENCE (selected excerpts):\n${options.timingContext}` : '';

    return `
You are an expert instructional coach analyzing a classroom transcript using the "${templateName}" evaluation framework.
\nYour main purpose: help the teacher improve.
- Reports should motivate, not punish.
- Feedback should highlight strengths, suggest clear next steps, and show how changes could improve learning.
- Numbers exist for admin tracking, but the narrative should always be teacher-facing and coaching-focused.

CLASS CONTEXT:
- Teacher: ${classInfo.teacherName}
- Class: ${classInfo.className}
- Subject: ${classInfo.subject}
- Grade: ${classInfo.grade}

EVALUATION CRITERIA:
${criteriaDescriptions}
${pauseMetricsSection ? `

${pauseMetricsSection}` : ''}
${timingSection}

MOTIVATIONAL SCORING RUBRIC (Apply to all criteria)

- 55–65 = Baseline / Absent but improvable → Give credit, explain how to add it.
- 66–75 = Emerging → Praise attempt, suggest refinement.
- 76–85 = Developing → Present but not consistent, suggest a coaching move.
- 86–92 = Strong → Consistently applied, celebrate and refine.
- 93–100 = Exemplary → Best practice, affirm and encourage sharing.

Coaching Feedback Guidelines (per criterion)
1. Score (with rationale) — always compared to target.
2. Evidence (timestamp/quote) — anchor in the transcript.
3. Strength observed — what the teacher did well (even if small).
4. Next step — a practical, bite-sized action to try.
5. Vision of better practice — describe how adding/refining this technique would change the lesson (e.g., “More student voices would make discussion livelier and deepen understanding”).
6. Exemplar — provide a short model (sample teacher prompt, cold call phrasing, or wait-time script).

Please analyze this classroom transcript and provide:

1) STRENGTHS
- 3–5 specific strengths demonstrated in the lesson.
- Distribute across major domains present in the template (e.g., Cold Call, Wait Time, Assessment, Framing) — at least one per domain when applicable.

2) IMPROVEMENTS
- 3–5 specific, actionable recommendations.
- Each suggestion MUST include a concrete teacher move (avoid vague advice).
- Example: instead of “increase wait time,” write: “After asking a question, silently count to 5 before rephrasing (e.g., [06:12] ‘What do we have to do?’ → teacher moved on too quickly).”
- Include a short exemplar of improved practice when helpful (e.g., “Instead of only calling on Ivan [05:51], add: ‘Sasha, what do you think? Amelia, can you add to that?’”).

 3) DETAILED ANALYSIS BY CATEGORY (Per Criterion)
 - score (0–100, motivational rubric)
 - feedback: 5–7 sentences minimum, covering in order:
   1) one concrete strength you observed (positive framing)
   2) one transcript quote + timestamp as evidence
   3) what the teacher did that limited the technique (gap)
   4) why this gap matters for student learning
   5) one actionable next step the teacher can try immediately
   6) a short “vision of better practice” (what the class would look/feel like if improved)
   7) if possible, provide a model teacher script or routine
 - evidence_excerpt: a short transcript quote (1–2 lines)
 - evidence_timestamp: approximate [mm:ss] or [hh:mm:ss]
 - observed_vs_target: counts or averages vs. benchmark
 - next_step_teacher_move: clear, actionable suggestion
 - vision_of_better_practice: how implementing this change would improve lesson dynamics
 - exemplar: a short model (e.g., sample teacher prompt, cold-call phrasing, or wait-time script)

IMPORTANT:
- Do NOT calculate an overall score. Only provide individual criterion scores.
- Ground claims with timestamps and quantitative cues where possible (student talk %, counts, averages).

OUTPUT REQUIREMENT (return ONE JSON object exactly):
{
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "detailed_feedback": {
    "criterion_name": {
      "score": number,
      "feedback": "5–7 sentences minimum covering: strength; evidence quote+timestamp; gap; why it matters; immediate next step; vision of better practice; model teacher script/routine if possible",
      "evidence_excerpt": ["short quote 1", "short quote 2 (optional)"],
      "evidence_timestamp": ["[mm:ss]", "[mm:ss] (optional)"],
      "observed_vs_target": "quantified comparison",
      "next_step_teacher_move": "specific micro-action",
      "vision_of_better_practice": "brief description of improved classroom experience",
      "exemplar": "≤25-word teacher script or routine",
      "look_fors": ["observable #1", "observable #2"],
      "avoid": ["pitfall #1"]
    }
  },
  "coaching_summary": "2–3 motivational paragraphs highlighting progress, celebrating wins, and giving 1–2 priorities for next lesson.",
  "next_lesson_plan": {
    "focus_priorities": ["Priority 1", "Priority 2"],
    "10_min_practice_block": [
      "Minute 0–3: …",
      "Minute 3–6: …",
      "Minute 6–10: …"
    ],
    "success_metrics": ["Metric 1 with target", "Metric 2 with target"]
  }
}

REQUIREMENTS:
- Include an entry in detailed_feedback for EVERY criterion listed above; do not omit any. If a criterion has no transcript evidence, include it with Motivational Baseline scoring (55–65, e.g., 55) and state "No transcript evidence available. Do not score below 55."

Base your analysis on the transcript evidence, be specific, and avoid generic advice.
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
    options?: { pauseMetrics?: PauseMetrics | null; timingContext?: string }
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
      const prompt = this.buildAnalysisPrompt(templateName, criterions, classInfo, options);

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
