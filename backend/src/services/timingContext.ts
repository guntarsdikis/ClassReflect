import type { Pool, RowDataPacket } from 'mysql2/promise';

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const ms = Math.round((seconds % 1) * 1000);
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}

type Word = { idx: number; text: string; start: number; end: number };

export async function buildTimingContext(pool: Pool, jobId: string): Promise<string | null> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT word_index, word_text, start_time, end_time
       FROM word_timestamps
       WHERE job_id = ?
       ORDER BY word_index ASC`,
      [jobId]
    );
    if (!rows || rows.length === 0) return null;

    const words: Word[] = rows
      .map(r => ({
        idx: Number(r.word_index),
        text: String(r.word_text || ''),
        start: Number(r.start_time),
        end: Number(r.end_time)
      }))
      .filter(w => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start)
      .sort((a, b) => a.start - b.start);

    if (words.length === 0) return null;

    // Identify pauses (gaps between end of word i and start of word i+1)
    const gaps: Array<{ start: number; end: number; dur: number; i: number }> = [];
    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      if (gap > 0) gaps.push({ start: words[i].end, end: words[i + 1].start, dur: gap, i });
    }

    // Build short list of longest pauses
    const LONG_GAP = 3.0; // seconds
    const longest = gaps
      .filter(g => g.dur >= LONG_GAP)
      .sort((a, b) => b.dur - a.dur)
      .slice(0, 5);

    const aroundPause = (centerIndex: number, windowSec = 4): { before: string; after: string } => {
      const leftStart = Math.max(0, words[centerIndex].end - windowSec);
      const rightEnd = words[centerIndex + 1] ? words[centerIndex + 1].start + windowSec : words[centerIndex].end + windowSec;
      const beforeTokens = words.filter(w => w.start >= leftStart && w.end <= words[centerIndex].end).map(w => w.text);
      const afterTokens = words.filter(w => w.start >= (words[centerIndex + 1]?.start || 0) && w.end <= rightEnd).map(w => w.text);
      const clamp = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
      return { before: clamp(beforeTokens.join(' ')), after: clamp(afterTokens.join(' ')) };
    };

    const longestPausesLines = longest.map(p => {
      const ctx = aroundPause(p.i);
      return `- ${formatClock(p.start)} – ${formatClock(p.end)} (${p.dur.toFixed(2)}s) | "${ctx.before}" → "${ctx.after}"`;
    });

    // Build brief time-coded segments to orient the model
    const GAP_THRESHOLD = 1.5; // segment break
    const MAX_SEG_SECONDS = 10.0;
    type Segment = { start: number; end: number; text: string };
    const segments: Segment[] = [];
    let segStart = words[0].start;
    let segEnd = words[0].end;
    let buf: string[] = [words[0].text];
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const gap = Math.max(0, w.start - segEnd);
      const durationIfAdded = Math.max(segEnd, w.end) - segStart;
      const shouldBreak = gap >= GAP_THRESHOLD || durationIfAdded > MAX_SEG_SECONDS;
      if (shouldBreak) {
        segments.push({ start: segStart, end: segEnd, text: buf.join(' ') });
        segStart = w.start;
        buf = [w.text];
      } else {
        buf.push(w.text);
      }
      segEnd = Math.max(segEnd, w.end);
    }
    if (buf.length) segments.push({ start: segStart, end: segEnd, text: buf.join(' ') });

    const sampleSegments = segments.slice(0, 8).map(s => {
      const text = s.text.length > 180 ? s.text.slice(0, 179) + '…' : s.text;
      return `[${formatClock(s.start)} - ${formatClock(s.end)}] ${text}`;
    });

    const timingContext = [
      'TIME-CODED OUTLINE (selected excerpts):',
      ...sampleSegments,
      '',
      'LONGEST PAUSES (context around silence):',
      ...(longestPausesLines.length ? longestPausesLines : ['- none ≥ 3.0s found'])
    ].join('\n');

    return timingContext;
  } catch (e) {
    console.warn('Timing context unavailable:', (e as any)?.message || e);
    return null;
  }
}

