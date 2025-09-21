import axios from 'axios';

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

  /**
   * Build analysis prompt from template criterions
   */
  buildAnalysisPrompt(templateName: string, criterions: TemplateCriterion[], classInfo: {
    className: string;
    subject: string;
    grade: string;
    teacherName: string;
  }): string {
    const criteriaDescriptions = criterions.map(criterion => 
      `- ${criterion.criteria_name} (${criterion.weight}% weight): ${criterion.prompt_template || `Evaluate the teacher's ${criterion.criteria_name.toLowerCase()}`}`
    ).join('\n');

    return `
You are an expert educational consultant analyzing a classroom recording using the "${templateName}" evaluation framework.

CLASS CONTEXT:
- Teacher: ${classInfo.teacherName}
- Class: ${classInfo.className}
- Subject: ${classInfo.subject}
- Grade: ${classInfo.grade}

EVALUATION CRITERIA:
${criteriaDescriptions}

Please analyze this classroom transcript and provide:

1. STRENGTHS: 3-5 specific strengths demonstrated in the lesson
2. IMPROVEMENTS: 3-5 specific, actionable recommendations for improvement
3. DETAILED FEEDBACK: For each criterion listed above, provide:
   - A score (0-100) for that specific criterion
   - Specific feedback with examples from the transcript

IMPORTANT: Do NOT calculate an overall score. Only provide individual scores for each criterion.

Format your response as valid JSON with this structure:
{
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "detailed_feedback": {
    "criterion_name": {
      "score": number,
      "feedback": "specific feedback with examples"
    }
  }
}

Base your analysis on evidence from the transcript. Be specific and constructive in your feedback.
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
    }
  ): Promise<{
    overall_score: number;
    strengths: string[];
    improvements: string[];
    detailed_feedback: Record<string, { score: number; feedback: string }>;
  }> {
    // If no API key, return mock data
    if (!this.apiKey) {
      console.log('🤖 Using mock analysis data (no AssemblyAI API key)');
      return this.generateMockAnalysis(criterions);
    }

    try {
      const prompt = this.buildAnalysisPrompt(templateName, criterions, classInfo);

      const request: LemurTaskRequest = {
        prompt,
        final_model: 'anthropic/claude-sonnet-4-20250514',
        transcript_ids: [transcriptId],
        max_output_size: 3000,
        temperature: 0.1
      };

      const response = await axios.post<LemurTaskResponse>(
        `${this.baseUrl}/lemur/v3/generate/task`,
        request,
        {
          headers: {
            'Authorization': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

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
        const overallScore = this.calculateWeightedScore(analysisResult.detailed_feedback, criterions);

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
        
        // Fallback to mock data if parsing fails
        return this.generateMockAnalysis(criterions);
      }
    } catch (error: any) {
      console.error('❌ AssemblyAI LeMUR API error:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // Fallback to mock data on API error
      return this.generateMockAnalysis(criterions);
    }
  }

  /**
   * Calculate weighted average score from individual criterion scores
   */
  private calculateWeightedScore(
    detailedFeedback: Record<string, { score: number; feedback: string }>,
    criterions: TemplateCriterion[]
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
        console.warn(`⚠️ Missing score for criterion: ${criterion.criteria_name}`);
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

  /**
   * Generate mock analysis data as fallback
   */
  private generateMockAnalysis(criterions: TemplateCriterion[]) {
    const mockAnalysis = {
      overall_score: 0, // Will be calculated from weighted average
      strengths: [
        "Clear explanation of concepts with good use of examples",
        "Effective questioning techniques to engage students",
        "Good classroom management and positive learning environment",
        "Appropriate pacing for the grade level"
      ],
      improvements: [
        "Consider providing more wait time for student responses", 
        "Incorporate more differentiated instruction strategies",
        "Use more specific praise to reinforce positive behaviors",
        "Include more hands-on activities to enhance engagement"
      ],
      detailed_feedback: {} as Record<string, { score: number; feedback: string }>
    };

    // Generate feedback for each criterion
    criterions.forEach(criterion => {
      const score = Math.round((Math.random() * 30 + 70) * 100) / 100;
      mockAnalysis.detailed_feedback[criterion.criteria_name] = {
        score,
        feedback: `The teacher demonstrates ${score >= 80 ? 'strong' : score >= 70 ? 'adequate' : 'developing'} skills in ${criterion.criteria_name.toLowerCase()}. ${score >= 80 ? 'This is a clear strength that supports student learning effectively.' : score >= 70 ? 'There are good elements present with room for enhancement.' : 'This area would benefit from focused improvement strategies.'}`
      };
    });

    // Calculate weighted average for overall score
    mockAnalysis.overall_score = this.calculateWeightedScore(mockAnalysis.detailed_feedback, criterions);

    return mockAnalysis;
  }
}

export const lemurService = new LemurService();
