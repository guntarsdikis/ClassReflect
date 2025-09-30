import { lemurService, type TemplateCriterion } from './lemur';
import { openaiProvider } from './openaiProvider';
import { geminiProvider } from './geminiProvider';
import { vertexProvider } from './vertexProvider';
import { openRouterProvider } from './openRouterProvider';
import type { PauseMetrics } from './pauseMetrics';

export type AnalysisProviderName = 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter';

export function getDefaultAnalysisProvider(): AnalysisProviderName {
  const p = (process.env.ANALYSIS_PROVIDER || 'lemur').toLowerCase();
  return p === 'openai' ? 'openai'
    : p === 'gemini' ? 'gemini'
    : p === 'vertex' ? 'vertex'
    : p === 'openrouter' ? 'openrouter'
    : 'lemur';
}

interface AnalyzeOptions {
  transcriptId: string;
  transcriptText: string;
  templateName: string;
  criterions: TemplateCriterion[];
  classInfo: {
    className: string;
    subject: string;
    grade: string;
    teacherName: string;
  };
}

export async function analyzeWithTemplateUsingProvider(
  provider: AnalysisProviderName,
  opts: AnalyzeOptions,
  extra?: { openaiModel?: string; openrouterModel?: string; pauseMetrics?: PauseMetrics | null; timingContext?: string | null; templateId?: number }
): Promise<{
  overall_score: number;
  strengths: string[];
  improvements: string[];
  detailed_feedback: Record<string, { score: number; feedback: string }>;
}> {
  if (provider === 'openai') {
    return await openaiProvider.analyzeWithTemplate(
      opts.transcriptText,
      opts.templateName,
      opts.criterions,
      opts.classInfo,
      { model: extra?.openaiModel, pauseMetrics: extra?.pauseMetrics, timingContext: extra?.timingContext || undefined, templateId: extra?.templateId }
    );
  }

  if (provider === 'gemini') {
    // Use Gemini provider for analysis
    const result = await geminiProvider.analyze(
      opts.transcriptText,
      opts.criterions,
      {
        teacher_name: opts.classInfo.teacherName,
        class_name: opts.classInfo.className,
        subject: opts.classInfo.subject,
        grade: opts.classInfo.grade,
        template_name: opts.templateName,
        template_id: extra?.templateId,
        timing_metrics: extra?.timingContext || undefined,
        wait_time_metrics: extra?.pauseMetrics ? formatPauseMetrics(extra.pauseMetrics) : undefined
      }
    );

    if (!result.success || !result.analysis) {
      throw new Error(result.error || 'Gemini analysis failed');
    }

    // Calculate overall score from detailed feedback
    const criteriaScores = Object.values(result.analysis.detailed_feedback).map((f: any) => f.score);
    const overall_score = criteriaScores.length > 0
      ? Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)
      : 0;

    return {
      overall_score,
      strengths: result.analysis.strengths || [],
      improvements: result.analysis.improvements || [],
      detailed_feedback: result.analysis.detailed_feedback || {}
    };
  }

  if (provider === 'vertex') {
    const result = await vertexProvider.analyze(
      opts.transcriptText,
      opts.criterions,
      {
        teacher_name: opts.classInfo.teacherName,
        class_name: opts.classInfo.className,
        subject: opts.classInfo.subject,
        grade: opts.classInfo.grade,
        template_name: opts.templateName,
        template_id: extra?.templateId,
        timing_metrics: extra?.timingContext || undefined,
        wait_time_metrics: extra?.pauseMetrics ? formatPauseMetrics(extra.pauseMetrics) : undefined
      }
    );

    if (!result.success || !result.analysis) {
      throw new Error(result.error || 'Vertex analysis failed');
    }

    const criteriaScores = Object.values(result.analysis.detailed_feedback).map((f: any) => f.score);
    const overall_score = criteriaScores.length > 0
      ? Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)
      : 0;

    return {
      overall_score,
      strengths: result.analysis.strengths || [],
      improvements: result.analysis.improvements || [],
      detailed_feedback: result.analysis.detailed_feedback || {}
    };
  }

  if (provider === 'openrouter') {
    const result = await openRouterProvider.analyze(
      opts.transcriptText,
      opts.criterions,
      {
        teacher_name: opts.classInfo.teacherName,
        class_name: opts.classInfo.className,
        subject: opts.classInfo.subject,
        grade: opts.classInfo.grade,
        template_name: opts.templateName,
        template_id: extra?.templateId,
        timing_metrics: extra?.timingContext || undefined,
        wait_time_metrics: extra?.pauseMetrics ? formatPauseMetrics(extra.pauseMetrics) : undefined
      },
      extra?.openrouterModel
    );

    if (!result.success || !result.analysis) {
      throw new Error(result.error || 'OpenRouter analysis failed');
    }

    const criteriaScores = Object.values(result.analysis.detailed_feedback).map((f: any) => f.score);
    const overall_score = criteriaScores.length > 0
      ? Math.round(criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length)
      : 0;

    return {
      overall_score,
      strengths: result.analysis.strengths || [],
      improvements: result.analysis.improvements || [],
      detailed_feedback: result.analysis.detailed_feedback || {}
    };
  }

  return await lemurService.analyzeWithTemplate(
    opts.transcriptId,
    opts.templateName,
    opts.criterions,
    opts.classInfo,
    { pauseMetrics: extra?.pauseMetrics, timingContext: extra?.timingContext || undefined, templateId: extra?.templateId }
  );
}

// Helper function to format pause metrics for Gemini
function formatPauseMetrics(pauseMetrics: PauseMetrics): string {
  return `Wait Time Analysis:
- Long Silences: ${pauseMetrics.longSilenceCount} (>${pauseMetrics.longSilenceThresholdSeconds}s)
- Average Silence Duration: ${pauseMetrics.averageSilenceSeconds.toFixed(2)}s
- Longest Silence: ${pauseMetrics.longestSilenceSeconds.toFixed(2)}s
- Total Silence Percentage: ${pauseMetrics.silencePercentage.toFixed(1)}%`;
}
