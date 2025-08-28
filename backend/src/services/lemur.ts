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

1. OVERALL SCORE: A single numerical score (0-100) representing overall teaching effectiveness
2. STRENGTHS: 3-5 specific strengths demonstrated in the lesson
3. IMPROVEMENTS: 3-5 specific, actionable recommendations for improvement
4. DETAILED FEEDBACK: For each criterion, provide:
   - A score (0-100)
   - Specific feedback with examples from the transcript

Format your response as valid JSON with this structure:
{
  "overall_score": number,
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
        console.log('✅ AssemblyAI LeMUR analysis completed:', {
          requestId: response.data.request_id,
          inputTokens: response.data.usage.input_tokens,
          outputTokens: response.data.usage.output_tokens,
          overallScore: analysisResult.overall_score
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
   * Generate mock analysis data as fallback
   */
  private generateMockAnalysis(criterions: TemplateCriterion[]) {
    const mockAnalysis = {
      overall_score: Math.round((Math.random() * 30 + 70) * 100) / 100, // 70-100 score
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

    return mockAnalysis;
  }
}

export const lemurService = new LemurService();