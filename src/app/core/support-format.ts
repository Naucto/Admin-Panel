import type {
  BugCategory,
  BugContext,
  BugStatus,
  BugView,
  CrashSource,
  CrashStatus,
  FeedbackContext,
  FeedbackSource,
  RatingReason,
} from './types';

/** Scores of 4 or less count as low, as the backend's `lowShare` does; 8 and up as high. */
export const LOW_SCORE = 4;
export const HIGH_SCORE = 8;

export type ScoreTone = 'low' | 'mid' | 'high';

export function scoreTone(score: number): ScoreTone {
  if (score <= LOW_SCORE) {
    return 'low';
  }
  return score >= HIGH_SCORE ? 'high' : 'mid';
}

const SCORE_CHIPS: Record<ScoreTone, string> = {
  low: 'nc-chip nc-chip-warn',
  mid: 'nc-chip',
  high: 'nc-chip nc-chip-gold',
};
const SCORE_INKS: Record<ScoreTone, string> = {
  low: 'text-orange-ink',
  mid: 'text-ink',
  high: 'text-gold-ink',
};

export function scoreChip(score: number): string {
  return SCORE_CHIPS[scoreTone(score)];
}

export function scoreInk(score: number): string {
  return SCORE_INKS[scoreTone(score)];
}

export function formatAverage(average: number | null): string {
  return average === null ? '--' : `${average.toFixed(1)} / 10`;
}

export function formatShare(share: number | null): string {
  return share === null ? '--' : `${Math.round(share * 100)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CONTEXT_LABELS: Record<FeedbackContext, string> = {
  PLAYER: 'Player',
  CREATOR: 'Creator',
};

export const SOURCE_LABELS: Record<FeedbackSource, string> = {
  PROMPT: 'Prompted',
  MANUAL: 'From the menu',
};

export const REASON_LABELS: Record<RatingReason, string> = {
  BUGS: 'Bugs',
  PERFORMANCE: 'Performance',
  HARD_TO_USE: 'Hard to use',
  MISSING_FEATURE: 'Missing feature',
  CONTENT: 'Content',
  OTHER: 'Other',
};

export const BUG_VIEW_LABELS: Record<BugView, string> = {
  NEW: 'New',
  OPEN: 'Open',
  CLOSED: 'Closed',
  ALL: 'All',
};

export const BUG_CATEGORY_LABELS: Record<BugCategory, string> = {
  GAMEPLAY: 'Gameplay',
  EDITOR: 'Editor',
  GRAPHICS: 'Graphics',
  SOUND: 'Sound',
  NETPLAY: 'Multiplayer',
  ACCOUNT: 'Account',
  PERFORMANCE: 'Performance',
  OTHER: 'Other',
};

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  NEW: 'New',
  TRIAGED: 'Triaged',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  WONT_FIX: "Won't fix",
  DUPLICATE: 'Duplicate',
};

const BUG_STATUS_CHIPS: Record<BugStatus, string> = {
  NEW: 'nc-chip nc-chip-warn',
  TRIAGED: 'nc-chip nc-chip-gold',
  IN_PROGRESS: 'nc-chip nc-chip-gold',
  RESOLVED: 'nc-chip nc-chip-ok',
  WONT_FIX: 'nc-chip nc-chip-quiet',
  DUPLICATE: 'nc-chip nc-chip-quiet',
};

export function bugStatusChip(status: BugStatus): string {
  return BUG_STATUS_CHIPS[status];
}

export const CRASH_SOURCE_LABELS: Record<CrashSource, string> = {
  WEB: 'Web',
  ENGINE: 'Engine',
  BACKEND: 'Backend',
};

export const CRASH_STATUS_LABELS: Record<CrashStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  IGNORED: 'Ignored',
};

const CRASH_STATUS_CHIPS: Record<CrashStatus, string> = {
  OPEN: 'nc-chip nc-chip-warn',
  RESOLVED: 'nc-chip nc-chip-ok',
  IGNORED: 'nc-chip nc-chip-quiet',
};

export function crashStatusChip(status: CrashStatus): string {
  return CRASH_STATUS_CHIPS[status];
}

/** Options for a select or a segmented control, in the order the labels are declared. */
export function optionsOf<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}

/** An event's free-form extra as one compact line, `kind=webgl-context-lost phase=draw`. */
export function compactPairs(extra: Record<string, unknown> | null | undefined): string {
  return Object.entries(extra ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
    )
    .join(' ');
}

/** The browser and system a report came from, as one line, with what is missing left out. */
export function runtimeLine(parts: {
  browser?: string | null;
  os?: string | null;
  device?: string | null;
}): string {
  return [parts.browser, parts.os, parts.device].filter((part) => !!part).join(' · ');
}

export interface ContextRow {
  label: string;
  value: string;
}

/** The context a bug report carried, as label and value rows, with what is missing left out. */
export function bugContextRows(bug: {
  route: string;
  release: { id: number; name: string } | null;
  context: BugContext;
}): ContextRow[] {
  const rows: [string, string | null | undefined][] = [
    ['Page', bug.route],
    ['Game', bug.release ? `${bug.release.name} #${bug.release.id}` : null],
    ['App release', bug.context.appRelease],
    ['Viewport', bug.context.viewport],
    ['Language', bug.context.language],
    ['Browser', bug.context.browser],
    ['System', bug.context.os],
    ['Device', bug.context.device],
  ];
  return rows
    .filter((row): row is [string, string] => typeof row[1] === 'string' && row[1] !== '')
    .map(([label, value]) => ({ label, value }));
}
