import { lemurService, type TemplateCriterion } from './lemur';
import { openaiProvider } from './openaiProvider';
import type { PauseMetrics } from './pauseMetrics';

export type AnalysisProviderName = 'lemur' | 'openai';

export function getDefaultAnalysisProvider(): AnalysisProviderName {
  const p = (process.env.ANALYSIS_PROVIDER || 'lemur').toLowerCase();
  return p === 'openai' ? 'openai' : 'lemur';
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
  extra?: { openaiModel?: string; pauseMetrics?: PauseMetrics | null; timingContext?: string | null; templateId?: number }
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

  return await lemurService.analyzeWithTemplate(
    opts.transcriptId,
    opts.templateName,
    opts.criterions,
    opts.classInfo,
    { pauseMetrics: extra?.pauseMetrics, timingContext: extra?.timingContext || undefined, templateId: extra?.templateId }
  );
}
