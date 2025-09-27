// Lightweight date/time formatting helpers for consistent local display
// - All instants from the API are assumed to be UTC (ISO with Z)
// - DATE-only fields (YYYY-MM-DD) are treated as calendar dates (no TZ shifts)

type DateStyle = 'full' | 'long' | 'medium' | 'short';
type TimeStyle = 'full' | 'long' | 'medium' | 'short';

function isDateOnlyString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Matches common MySQL DATETIME strings without timezone, e.g. '2025-09-27 08:07:00'
function isNaiveDateTimeString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
  );
}

function toDateAssumingUtc(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (isNaiveDateTimeString(value)) {
    const sep = value.includes('T') ? 'T' : ' ';
    const [datePart, timePart] = value.split(sep);
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm, ss] = timePart.split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }
  // Fallback: let Date parse (supports ISO with Z)
  return new Date(value);
}

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Format a calendar date for display. If the input is DATE-only (YYYY-MM-DD),
// keep the same day across locales by formatting in UTC. For instants (ISO with time),
// format in the user's local timezone.
export function formatDateLocal(
  value: string | number | Date,
  opts?: { locale?: string; dateStyle?: DateStyle }
): string {
  const locale = opts?.locale;
  const dateStyle: DateStyle = opts?.dateStyle ?? 'medium';

  if (isDateOnlyString(value)) {
    const [y, m, d] = value.split('-').map(Number);
    const dateUtc = new Date(Date.UTC(y, m - 1, d));
    return dateUtc.toLocaleDateString(locale, { timeZone: 'UTC', dateStyle });
  }

  const userTz = getUserTimeZone();
  const d = toDateAssumingUtc(value);
  return d.toLocaleDateString(locale, { timeZone: userTz, dateStyle });
}

// Format a local date+time from a UTC instant string/Date.
export function formatDateTimeLocal(
  value: string | number | Date,
  opts?: { locale?: string; dateStyle?: DateStyle; timeStyle?: TimeStyle }
): string {
  const locale = opts?.locale;
  const dateStyle: DateStyle = opts?.dateStyle ?? 'medium';
  const timeStyle: TimeStyle = opts?.timeStyle ?? 'short';
  const userTz = getUserTimeZone();
  const d = toDateAssumingUtc(value);
  return d.toLocaleString(locale, { timeZone: userTz, dateStyle, timeStyle });
}

// Format a local time portion only from a UTC instant string/Date.
export function formatTimeLocal(
  value: string | number | Date,
  opts?: { locale?: string; timeStyle?: TimeStyle }
): string {
  const locale = opts?.locale;
  const timeStyle: TimeStyle = opts?.timeStyle ?? 'short';
  const userTz = getUserTimeZone();
  const d = toDateAssumingUtc(value);
  return d.toLocaleTimeString(locale, { timeZone: userTz, timeStyle });
}
