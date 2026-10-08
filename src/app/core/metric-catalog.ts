export type MetricUnit = 'count' | 'durationMs' | 'durationSeconds' | 'minutes' | 'percent';

export interface MetricLabel {
  label: string;
  unit: MetricUnit;
  group: 'Audience' | 'Play' | 'Creation' | 'Multiplayer' | 'Presence';
}

/** How each backend metric reads in the panel. A metric missing here still shows, by its name. */
export const METRIC_LABELS: Record<string, MetricLabel> = {
  visitors: { label: 'Visitors', unit: 'count', group: 'Audience' },
  visitors_new: { label: 'New visitors', unit: 'count', group: 'Audience' },
  visitors_returning: { label: 'Returning visitors', unit: 'count', group: 'Audience' },
  sessions: { label: 'Sessions', unit: 'count', group: 'Audience' },
  sessions_bounced: { label: 'Bounced sessions', unit: 'count', group: 'Audience' },
  session_seconds_total: { label: 'Time on site', unit: 'durationSeconds', group: 'Audience' },
  session_seconds_median: { label: 'Median visit', unit: 'durationSeconds', group: 'Audience' },
  pageviews: { label: 'Page views', unit: 'count', group: 'Audience' },
  active_minutes: { label: 'Active minutes', unit: 'minutes', group: 'Audience' },
  accounts_active: { label: 'Active accounts', unit: 'count', group: 'Audience' },
  bounce_rate: { label: 'Bounce rate', unit: 'percent', group: 'Audience' },
  session_seconds_mean: { label: 'Average visit', unit: 'durationSeconds', group: 'Audience' },
  plays: { label: 'Plays', unit: 'count', group: 'Play' },
  playtime_ms: { label: 'Play time', unit: 'durationMs', group: 'Play' },
  players: { label: 'Players', unit: 'count', group: 'Play' },
  signups: { label: 'Sign-ups', unit: 'count', group: 'Creation' },
  builders_active: { label: 'Active builders', unit: 'count', group: 'Creation' },
  build_minutes: { label: 'Minutes building', unit: 'minutes', group: 'Creation' },
  projects_created: { label: 'Projects created', unit: 'count', group: 'Creation' },
  releases_published: { label: 'Games published', unit: 'count', group: 'Creation' },
  releases_updated: { label: 'Game updates', unit: 'count', group: 'Creation' },
  releases_unpublished: { label: 'Games unpublished', unit: 'count', group: 'Creation' },
  mp_rooms_created: { label: 'Rooms created', unit: 'count', group: 'Multiplayer' },
  mp_rooms_connected: { label: 'Rooms connected', unit: 'count', group: 'Multiplayer' },
  mp_sessions: { label: 'Multiplayer sessions', unit: 'count', group: 'Multiplayer' },
  mp_participants: { label: 'Multiplayer players', unit: 'count', group: 'Multiplayer' },
  mp_minutes: { label: 'Multiplayer minutes', unit: 'minutes', group: 'Multiplayer' },
  mp_player_minutes: { label: 'Player-minutes', unit: 'minutes', group: 'Multiplayer' },
  active_browsers_peak: { label: 'Peak online', unit: 'count', group: 'Presence' },
  anon_tabs_peak: { label: 'Peak anonymous tabs', unit: 'count', group: 'Presence' },
  accounts_peak: { label: 'Peak accounts online', unit: 'count', group: 'Presence' },
  presence_minutes_sampled: { label: 'Minutes sampled', unit: 'minutes', group: 'Presence' },
  active_browser_minutes: { label: 'Browser-minutes', unit: 'minutes', group: 'Presence' },
  anon_tab_minutes: { label: 'Anonymous tab-minutes', unit: 'minutes', group: 'Presence' },
};

export const DIMENSION_LABELS: Record<string, string> = {
  country: 'Country',
  device: 'Device',
  browser: 'Browser',
  os: 'System',
  screen: 'Screen',
  language: 'Language',
  referrer: 'Referrer',
  utm_source: 'Campaign source',
  utm_campaign: 'Campaign',
  route: 'Page',
  release: 'Game',
  state: 'Activity',
  hour: 'Hour (UTC)',
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric]?.label ?? metric;
}

const COUNT = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatCount(value: number, compact = false): string {
  return (compact && Math.abs(value) >= 10_000 ? COMPACT : COUNT).format(value);
}

/** A duration in the largest unit that keeps it short: 45 s, 12 min, 3.4 h, 1,204 h. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }
  if (seconds < 3_600) {
    return `${Math.round(seconds / 60)} min`;
  }
  const hours = seconds / 3_600;
  return `${COUNT.format(hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours))} h`;
}

export function formatMetric(metric: string, value: number | null, compact = false): string {
  if (value === null) {
    return '--';
  }
  switch (METRIC_LABELS[metric]?.unit) {
    case 'durationMs':
      return formatDuration(value / 1000);
    case 'durationSeconds':
      return formatDuration(value);
    case 'minutes':
      return formatDuration(value * 60);
    case 'percent':
      return `${COUNT.format(Math.round(value * 10) / 10)}%`;
    default:
      return formatCount(value, compact);
  }
}
