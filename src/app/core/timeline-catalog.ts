import type { TimelineBucket, TimelineMetric } from './types';

/**
 * Who a series is about, so the same people wear the same colour on every chart: browsers that
 * accepted analytics, tabs that refused it, tabs that have not answered, and anonymous tabs whose
 * answer was not sent (before the answer was, or while an account was suspended).
 */
export const CONSENT_COLOURS = {
  accepted: '#68aed4',
  declined: '#ff2674',
  unanswered: '#ffd100',
  unknown: '#8a8177',
  anonymous: '#ff80a4',
} as const;

export interface TimelineMetricLabel {
  label: string;
  /** A few words on who is counted, under the label. */
  who: string;
  colour: string;
  /** Split by game when one is chosen. */
  byGame: boolean;
  /** Split by source when one is chosen. */
  bySource: boolean;
}

export const TIMELINE_LABELS: Record<TimelineMetric, TimelineMetricLabel> = {
  visitors_new: {
    label: 'New visitors',
    who: 'accepted analytics',
    colour: '#ffd100',
    byGame: false,
    bySource: true,
  },
  sessions: {
    label: 'Sessions',
    who: 'accepted analytics',
    colour: '#ffd100',
    byGame: false,
    bySource: true,
  },
  pageviews: {
    label: 'Page views',
    who: 'accepted analytics',
    colour: '#ffd100',
    byGame: false,
    bySource: true,
  },
  plays_consented: {
    label: 'Plays · accepted',
    who: 'accepted analytics',
    colour: CONSENT_COLOURS.accepted,
    byGame: true,
    bySource: true,
  },
  plays_anonymous: {
    label: 'Plays · anonymous',
    who: 'declined or not answered, signed in or not',
    colour: CONSENT_COLOURS.anonymous,
    byGame: true,
    bySource: false,
  },
  plays_declined: {
    label: 'Plays · declined',
    who: 'refused analytics',
    colour: CONSENT_COLOURS.declined,
    byGame: true,
    bySource: false,
  },
  plays_unanswered: {
    label: 'Plays · not answered',
    who: 'has not answered the analytics question',
    colour: CONSENT_COLOURS.unanswered,
    byGame: true,
    bySource: false,
  },
  plays_anonymous_signed_in: {
    label: 'Plays · anonymous, signed in',
    who: 'declined or not answered, signed in',
    colour: '#ff8426',
    byGame: true,
    bySource: false,
  },
  players: {
    label: 'Players',
    who: 'accepted analytics',
    colour: '#10d275',
    byGame: true,
    bySource: true,
  },
  players_new: {
    label: 'First plays',
    who: 'accepted analytics, first game they played',
    colour: '#10d275',
    byGame: true,
    bySource: true,
  },
  signups: {
    label: 'Accounts created',
    who: 'everyone',
    colour: CONSENT_COLOURS.accepted,
    byGame: false,
    bySource: true,
  },
  signups_unlinked: {
    label: 'Accounts · declined',
    who: 'no browser that accepted analytics',
    colour: CONSENT_COLOURS.declined,
    byGame: false,
    bySource: false,
  },
  projects_created: {
    label: 'Projects created',
    who: 'everyone, forks included',
    colour: '#10d275',
    byGame: false,
    bySource: true,
  },
  projects_forked: {
    label: 'Forks',
    who: 'projects started from a published game, of the chosen game when one is chosen',
    colour: '#ff8426',
    byGame: true,
    bySource: true,
  },
  releases_published: {
    label: 'Games published',
    who: 'everyone',
    colour: '#ff2674',
    byGame: true,
    bySource: true,
  },
  releases_updated: {
    label: 'Game updates',
    who: 'everyone',
    colour: '#ff8426',
    byGame: true,
    bySource: false,
  },
  mp_sessions: {
    label: 'Multiplayer sessions',
    who: 'everyone, editor tests excluded',
    colour: '#ff8426',
    byGame: true,
    bySource: false,
  },
  mp_participants: {
    label: 'Multiplayer seats',
    who: 'everyone, editor tests excluded',
    colour: '#68aed4',
    byGame: true,
    bySource: false,
  },
  active_browsers: {
    label: 'Online · accepted',
    who: 'peak minute of the bucket',
    colour: CONSENT_COLOURS.accepted,
    byGame: false,
    bySource: false,
  },
  browsers_playing: {
    label: 'Playing · accepted',
    who: 'peak minute of the bucket',
    colour: CONSENT_COLOURS.accepted,
    byGame: false,
    bySource: false,
  },
  anon_tabs: {
    label: 'Online · anonymous tabs',
    who: 'declined or not answered, peak minute of the bucket, an estimate',
    colour: CONSENT_COLOURS.anonymous,
    byGame: false,
    bySource: false,
  },
  anon_tabs_playing: {
    label: 'Playing · anonymous tabs',
    who: 'declined or not answered, peak minute of the bucket, an estimate',
    colour: CONSENT_COLOURS.anonymous,
    byGame: false,
    bySource: false,
  },
  anon_tabs_declined: {
    label: 'Tabs · declined',
    who: 'refused analytics, peak minute of the bucket',
    colour: CONSENT_COLOURS.declined,
    byGame: false,
    bySource: false,
  },
  anon_tabs_unanswered: {
    label: 'Tabs · not answered',
    who: 'has not answered yet, peak minute of the bucket',
    colour: CONSENT_COLOURS.unanswered,
    byGame: false,
    bySource: false,
  },
  accounts_online: {
    label: 'Accounts online',
    who: 'peak sample of the bucket',
    colour: '#10d275',
    byGame: false,
    bySource: false,
  },
};

export const TIMELINE_METRIC_NAMES = Object.keys(TIMELINE_LABELS) as TimelineMetric[];

export type DerivedSeries = 'signups_linked' | 'plays_unknown';

/** What each derived series is computed from. */
export const DERIVED_FROM: Record<DerivedSeries, TimelineMetric[]> = {
  signups_linked: ['signups', 'signups_unlinked'],
  plays_unknown: ['plays_anonymous', 'plays_declined', 'plays_unanswered'],
};

/** The series a row draws; a derived series is computed from others before drawing. */
export type RowSeries =
  | { metric: TimelineMetric }
  | {
      derived: DerivedSeries;
      label: string;
      colour: string;
    };

export interface TimelineRow {
  key: string;
  label: string;
  hint: string;
  kind: 'bar' | 'line';
  stacked: boolean;
  series: RowSeries[];
}

/**
 * The rows of the timeline, each one scale. Series in a row share a unit and a meaning, so they
 * can stand on one axis: what would need a second axis gets a row of its own.
 */
export const TIMELINE_ROWS: TimelineRow[] = [
  {
    key: 'arrivals',
    label: 'New people',
    hint: 'First visits and first plays of browsers that accepted analytics',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'visitors_new' }, { metric: 'players_new' }],
  },
  {
    key: 'plays',
    label: 'Plays by consent',
    hint: 'Every play started, stacked by what the tab answered to analytics',
    kind: 'bar',
    stacked: true,
    series: [
      { metric: 'plays_consented' },
      { metric: 'plays_declined' },
      { metric: 'plays_unanswered' },
      {
        derived: 'plays_unknown',
        label: 'Plays · answer not sent',
        colour: CONSENT_COLOURS.unknown,
      },
    ],
  },
  {
    key: 'accounts',
    label: 'Accounts created',
    hint: 'Stacked by whether a browser that accepted analytics is linked to them',
    kind: 'bar',
    stacked: true,
    series: [
      {
        derived: 'signups_linked',
        label: 'Accounts · accepted',
        colour: CONSENT_COLOURS.accepted,
      },
      { metric: 'signups_unlinked' },
    ],
  },
  {
    key: 'creating',
    label: 'Creating',
    hint: 'Projects created, forks among them, and games published',
    kind: 'bar',
    stacked: false,
    series: [
      { metric: 'projects_created' },
      { metric: 'projects_forked' },
      { metric: 'releases_published' },
    ],
  },
  {
    key: 'online',
    label: 'Online',
    hint: 'The busiest minute of each bucket',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'active_browsers' }, { metric: 'anon_tabs' }, { metric: 'accounts_online' }],
  },
  {
    key: 'answers',
    label: 'Anonymous tabs by answer',
    hint: 'Tabs that refused analytics against tabs that have not answered, busiest minute of each bucket',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'anon_tabs_declined' }, { metric: 'anon_tabs_unanswered' }],
  },
  {
    key: 'playing',
    label: 'Playing now',
    hint: 'The busiest minute of each bucket',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'browsers_playing' }, { metric: 'anon_tabs_playing' }],
  },
  {
    key: 'sessions',
    label: 'Sessions',
    hint: 'Visits of browsers that accepted analytics, when they started',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'sessions' }],
  },
  {
    key: 'pageviews',
    label: 'Page views',
    hint: 'Of browsers that accepted analytics',
    kind: 'line',
    stacked: false,
    series: [{ metric: 'pageviews' }],
  },
  {
    key: 'multiplayer',
    label: 'Multiplayer',
    hint: 'Rooms reaching two players, and seats joining',
    kind: 'bar',
    stacked: false,
    series: [{ metric: 'mp_sessions' }, { metric: 'mp_participants' }],
  },
];

export const DEFAULT_ROWS = ['arrivals', 'plays', 'accounts', 'creating', 'online', 'answers'];

/** The metrics a set of rows needs from the backend. */
export function metricsOfRows(rows: readonly TimelineRow[]): TimelineMetric[] {
  const metrics = new Set<TimelineMetric>();
  for (const row of rows) {
    for (const series of row.series) {
      if ('metric' in series) {
        metrics.add(series.metric);
      } else {
        for (const metric of DERIVED_FROM[series.derived]) {
          metrics.add(metric);
        }
      }
    }
  }
  return [...metrics];
}

export const BUCKET_MS: Record<TimelineBucket, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '6h': 21_600_000,
  '1d': 86_400_000,
};

export const BUCKET_LABELS: Record<TimelineBucket, string> = {
  '1m': 'Minute',
  '5m': '5 min',
  '15m': '15 min',
  '1h': 'Hour',
  '6h': '6 hours',
  '1d': 'Day',
};

export const BUCKETS = Object.keys(BUCKET_MS) as TimelineBucket[];

/** The backend's own limit on buckets per request. */
export const MAX_BUCKETS = 2_000;

/** The finest bucket that keeps a span under this many points. */
export function bucketFor(spanMs: number, points = 400): TimelineBucket {
  return BUCKETS.find((bucket) => spanMs / BUCKET_MS[bucket] <= points) ?? '1d';
}

/** The buckets worth offering for a span: at least two points, at most what the backend takes. */
export function bucketsFor(spanMs: number): TimelineBucket[] {
  return BUCKETS.filter(
    (bucket) => spanMs / BUCKET_MS[bucket] >= 2 && spanMs / BUCKET_MS[bucket] <= MAX_BUCKETS,
  );
}
