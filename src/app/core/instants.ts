import type { TimelineBucket } from './types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const DAY_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const WEEKDAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** An instant as a reader scans it: `21 Oct 18:05`, in UTC like the rest of the console. */
export function instantLabel(at: number | string): string {
  return DAY_TIME.format(typeof at === 'string' ? Date.parse(at) : at);
}

/** How a bucket reads on an axis: the time for buckets within a day, the day otherwise. */
export function bucketLabel(at: number, bucket: TimelineBucket, spanMs: number): string {
  if (bucket === '1d') {
    return DAY.format(at);
  }
  if (spanMs <= DAY_MS) {
    return TIME.format(at);
  }
  return DAY_TIME.format(at);
}

export function weekdayLabel(at: number): string {
  return WEEKDAY.format(at);
}

/** A span as words: `90 min`, `6 h`, `3 days`. */
export function spanLabel(spanMs: number): string {
  if (spanMs < 2 * HOUR_MS) {
    return `${String(Math.round(spanMs / MINUTE_MS))} min`;
  }
  if (spanMs < 2 * DAY_MS) {
    return `${String(Math.round((spanMs / HOUR_MS) * 10) / 10)} h`;
  }
  return `${String(Math.round((spanMs / DAY_MS) * 10) / 10)} days`;
}

/** The value of a `datetime-local` input for an instant, read as UTC. */
export function toUtcInput(at: number): string {
  return new Date(at).toISOString().slice(0, 16);
}

/** A `datetime-local` value read as UTC; null when it is not a complete date and time. */
export function fromUtcInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const at = Date.parse(`${value}:00Z`);
  return Number.isNaN(at) ? null : at;
}

/** The same instant on the reader's own clock, for those entering a time they know locally. */
export function localLabel(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(at);
}
