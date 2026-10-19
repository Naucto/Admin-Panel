import type { Grain } from './types';

const DAY_MS = 86_400_000;

/** Days are UTC calendar days, as the backend counts them. */
export function utcDay(at: Date | number = Date.now()): string {
  return new Date(at).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return utcDay(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** The finest grain that keeps a chart readable over this many days. */
export function grainFor(days: number): Grain {
  if (days <= 45) {
    return 'DAY';
  }
  return days <= 200 ? 'WEEK' : 'MONTH';
}

const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MONTH = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const LONG = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** How a period reads on an axis: a day, the week starting that day, or a month. */
export function periodLabel(periodStart: string, grain: Grain): string {
  const at = Date.parse(`${periodStart}T00:00:00Z`);
  if (grain === 'MONTH') {
    return MONTH.format(at);
  }
  return grain === 'WEEK' ? `wk ${SHORT.format(at)}` : SHORT.format(at);
}

export function longDay(day: string): string {
  return LONG.format(Date.parse(`${day}T00:00:00Z`));
}

const AGO = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return AGO.format(Math.round(seconds / size), unit);
    }
  }
  return 'just now';
}

const SHORT_AGO: [string, number][] = [
  ['y', 31_536_000],
  ['mo', 2_592_000],
  ['d', 86_400],
  ['h', 3_600],
  ['min', 60],
];

/** An age short enough for a table cell, as `3 h ago`. */
export function shortAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  for (const [unit, size] of SHORT_AGO) {
    if (seconds >= size) {
      return `${Math.floor(seconds / size)} ${unit} ago`;
    }
  }
  return 'just now';
}

const DAY_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export function dayTime(iso: string): string {
  return DAY_TIME.format(Date.parse(iso));
}
