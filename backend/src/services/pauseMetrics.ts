import type { Pool, RowDataPacket } from 'mysql2/promise';

export interface PauseMetrics {
  totalWords: number;
  totalDurationSeconds: number;
  totalSpeechSeconds: number;
  totalSilenceSeconds: number;
  averageSilenceSeconds: number;
  medianSilenceSeconds: number;
  p90SilenceSeconds: number;
  longestSilenceSeconds: number;
  longSilenceThresholdSeconds: number;
  longSilenceCount: number;
  longSilencePercentage: number;
  silencePercentage: number;
}

const LONG_SILENCE_THRESHOLD = 3; // seconds

export async function computePauseMetrics(pool: Pool, jobId: string): Promise<PauseMetrics | null> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT start_time, end_time FROM word_timestamps WHERE job_id = ? ORDER BY start_time ASC',
      [jobId]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const words = rows
      .map(row => ({
        start: Number(row.start_time),
        end: Number(row.end_time)
      }))
      .filter(word => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end >= word.start)
      .sort((a, b) => a.start - b.start);

    if (words.length < 2) {
      return null;
    }

    const speechDurations = words.map(word => word.end - word.start);
    const totalSpeechSeconds = speechDurations.reduce((sum, val) => sum + Math.max(0, val), 0);

    const gaps: number[] = [];
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].start - words[i - 1].end;
      if (gap > 0) {
        gaps.push(gap);
      }
    }

    const totalSilenceSeconds = gaps.reduce((sum, val) => sum + val, 0);
    const averageSilenceSeconds = gaps.length > 0 ? totalSilenceSeconds / gaps.length : 0;

    const sortedGaps = gaps.slice().sort((a, b) => a - b);
    const percentile = (p: number) => {
      if (sortedGaps.length === 0) return 0;
      const idx = Math.min(sortedGaps.length - 1, Math.floor((p / 100) * sortedGaps.length));
      return sortedGaps[idx];
    };

    const medianSilenceSeconds = sortedGaps.length === 0
      ? 0
      : sortedGaps.length % 2 === 1
        ? sortedGaps[(sortedGaps.length - 1) / 2]
        : (sortedGaps[sortedGaps.length / 2 - 1] + sortedGaps[sortedGaps.length / 2]) / 2;

    const p90SilenceSeconds = percentile(90);
    const longestSilenceSeconds = sortedGaps.length > 0 ? sortedGaps[sortedGaps.length - 1] : 0;

    const longSilenceCount = gaps.filter(gap => gap >= LONG_SILENCE_THRESHOLD).length;
    const longSilencePercentage = gaps.length > 0
      ? (longSilenceCount / gaps.length) * 100
      : 0;

    const totalDurationSeconds = Math.max(0, words[words.length - 1].end - words[0].start);
    const silencePercentage = totalDurationSeconds > 0
      ? (totalSilenceSeconds / totalDurationSeconds) * 100
      : 0;

    return {
      totalWords: words.length,
      totalDurationSeconds,
      totalSpeechSeconds,
      totalSilenceSeconds,
      averageSilenceSeconds,
      medianSilenceSeconds,
      p90SilenceSeconds,
      longestSilenceSeconds,
      longSilenceThresholdSeconds: LONG_SILENCE_THRESHOLD,
      longSilenceCount,
      longSilencePercentage,
      silencePercentage
    };
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      console.warn('⌛ word_timestamps table not found; skipping pause metrics computation');
      return null;
    }
    console.error('Failed to compute pause metrics:', error);
    return null;
  }
}
