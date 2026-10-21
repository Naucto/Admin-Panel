/**
 * The backend's `admin/*` contract, as its OpenAPI document states it (`swagger.json` in the
 * Backend repo). Kept by hand: the panel reads a dozen routes and no generated client is published.
 */

export type Grain = 'DAY' | 'WEEK' | 'MONTH';
export type PointStatus = 'final' | 'provisional' | 'unavailable';
export type RoleName = 'User' | 'Moderator' | 'Admin';

export interface MetricInfo {
  name: string;
  population: 'C' | 'C_LINKED' | 'A' | 'C_AND_A' | 'F' | 'PRESENCE';
  kind: 'additive' | 'max' | 'perGrain';
  finalization: 'ACTIVITY' | 'SESSION' | 'FACT' | 'MULTIPLAYER' | 'PRESENCE' | 'COHORT';
  version: number;
  dimensions: string[];
  definition: string;
}

export interface MetricsResponse {
  metrics: MetricInfo[];
  truncatedDimensions: string[];
  erasureContract: string;
}

export interface Point {
  periodStart: string;
  value: number | null;
  status: PointStatus;
  samplerCoverage: number | null;
  ingestErrorRate: number | null;
}

export interface Series {
  metric: string;
  dimension: string;
  grain: Grain;
  definitionVersion: number;
  points: Point[];
}

export interface Breakdown {
  metric: string;
  dimension: string;
  grain: Grain;
  periodStart: string;
  status: PointStatus;
  truncated: boolean;
  values: { key: string; value: number }[];
}

export interface Tile {
  metric: string;
  current: Point;
  previous: Point;
}

export interface Overview {
  grain: Grain;
  periodStart: string;
  tiles: Tile[];
}

export interface PresenceSample {
  at: string;
  activeBrowsers: number;
  activeBrowsersPlaying: number;
  activeBrowsersBuilding: number;
  activeBrowsersHosting: number;
  anonTabs: number;
  anonTabsPlaying: number;
  anonTabsBuilding: number;
  anonTabsHosting: number;
  accounts: number;
  accountsPlaying: number;
  accountsBuilding: number;
  accountsHosting: number;
}

export interface GameNow {
  releaseId: number;
  name: string | null;
  browsers: number;
  anonTabs: number;
}

export interface Live {
  note: string;
  samples: PresenceSample[];
  current: PresenceSample;
  /** Absent from a backend older than the answer in anonymous pings. */
  anonymousByAnswer?: { declined: number; unanswered: number; unknown: number };
  gamesNow: GameNow[];
}

export interface Presence {
  samples: PresenceSample[];
}

export type RetentionKind = 'VISITOR' | 'ACCOUNT';

export interface CohortOffset {
  offsetDays: number;
  retained: number | null;
  rate: number | null;
  mature: boolean;
}

export interface Cohort {
  cohortDay: string;
  size: number;
  offsets: CohortOffset[];
}

export interface Retention {
  kind: RetentionKind;
  version: number;
  cohorts: Cohort[];
}

export type FunnelStepName = 'visited' | 'played' | 'signedUp' | 'createdProject' | 'published';

export interface Funnel {
  from: string;
  to: string;
  population: string;
  steps: { step: FunnelStepName; count: number }[];
}

export type GameSort = 'plays' | 'playtime_ms' | 'players' | 'mp_sessions';

export interface GameStats {
  releaseId: number;
  name: string | null;
  plays: number;
  playtimeMs: number;
  players: number;
  mpSessions: number;
}

export interface Games {
  grain: Grain;
  periodStart: string;
  status: PointStatus;
  items: GameStats[];
  total: number;
  page: number;
  limit: number;
}

export interface GeoIpStatus {
  source: 'file' | 'download' | 'off';
  edition: string | null;
  loadedAt: string | null;
  error: string | null;
  /** Since the backend started. */
  lookups: { found: number; unknown: number; privateAddress: number; noDatabase: number };
}

export interface Health {
  ingest: { accepted: number; rejected: number; throttled: number; writeErrors: number };
  finalization: { finalization: string; lastFinalDay?: string | null }[];
  projectionBacklog: number;
  oldestProjectionWork: string | null;
  oldestRawDay: string | null;
  /** Absent from a backend older than country lookup diagnostics. */
  geoIp?: GeoIpStatus;
}

export interface AccountSummary {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  role: RoleName;
  createdAt: string;
}

export interface AdminSession {
  accessToken: string;
  expiresIn: number;
  account: AccountSummary;
}

export type TimelineBucket = '1m' | '5m' | '15m' | '1h' | '6h' | '1d';

export type TimelineMetric =
  | 'visitors_new'
  | 'sessions'
  | 'pageviews'
  | 'plays_consented'
  | 'plays_anonymous'
  | 'plays_declined'
  | 'plays_unanswered'
  | 'plays_anonymous_signed_in'
  | 'players'
  | 'players_new'
  | 'signups'
  | 'signups_unlinked'
  | 'projects_created'
  | 'projects_forked'
  | 'releases_published'
  | 'releases_updated'
  | 'mp_sessions'
  | 'mp_participants'
  | 'active_browsers'
  | 'browsers_playing'
  | 'anon_tabs'
  | 'anon_tabs_playing'
  | 'anon_tabs_declined'
  | 'anon_tabs_unanswered'
  | 'accounts_online';

export interface TimelineSeries {
  metric: TimelineMetric;
  population: MetricInfo['population'];
  combine: 'sum' | 'distinct' | 'max';
  definition: string;
  /** Filters of the request this metric is not split by. */
  ignoredFilters: ('release' | 'source')[];
  /** Null before the raw window, after now, and for a presence bucket without a sample. */
  values: (number | null)[];
  total: number | null;
}

export interface Timeline {
  from: string;
  to: string;
  bucket: TimelineBucket;
  bucketMs: number;
  rawFrom: string;
  buckets: string[];
  series: TimelineSeries[];
}

export interface TimelineSource {
  /** As the timeline takes it: `referrer:itch.io`. */
  source: string;
  kind: 'referrer' | 'utmSource' | 'utmCampaign';
  value: string | null;
  sessions: number;
  visitorsNew: number;
}

export type ActivityKind =
  | 'FIRST_VISIT'
  | 'FIRST_PLAY'
  | 'SIGNUP'
  | 'PROJECT_CREATED'
  | 'RELEASE_PUBLISHED'
  | 'RELEASE_UNPUBLISHED'
  | 'MP_SESSION'
  | 'ANONYMOUS_PLAYS';

export interface ActivityItem {
  at: string;
  kind: ActivityKind;
  /** A short code for one consenting browser, stable while the backend runs. */
  journey: string | null;
  releaseId: number | null;
  game: string | null;
  source: string | null;
  country: string | null;
  device: string | null;
  count: number;
  signedIn: boolean | null;
  /** Anonymous plays: what the tabs answered to analytics. */
  consent: 'DECLINED' | 'UNANSWERED' | 'UNKNOWN' | null;
}

export interface Activity {
  items: ActivityItem[];
  truncated: boolean;
}

export interface ArrivalSummary {
  arrived: number;
  played: number;
  signedUp: number;
  existingAccounts: number;
  createdProject: number;
  published: number;
  anonymousPlays: number;
  declinedPlays: number;
  unansweredPlays: number;
  anonymousSignedInPlays: number;
  unlinkedSignups: number;
}

export interface ArrivalGame {
  releaseId: number;
  name: string | null;
  players: number;
  plays: number;
  anonymousPlays: number;
}

export interface Arrival {
  journey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  referrer: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  country: string | null;
  device: string | null;
  sessions: number;
  plays: number;
  firstPlayAt: string | null;
  games: string[];
  account: 'NEW' | 'EXISTING' | null;
  signedUpAt: string | null;
  projectCreatedAt: string | null;
  publishedAt: string | null;
}

export interface Arrivals {
  summary: ArrivalSummary;
  games: ArrivalGame[];
  visitors: Arrival[];
}

export interface Release {
  releaseId: number;
  name: string;
  /** Null for a project not published, such as a fork. */
  publishedAt: string | null;
}

/** A game chosen in a picker: its id, and the name it had when chosen. */
export interface GameChoice {
  releaseId: number;
  name: string;
}

export type MarkerAudience = 'EVERYONE' | 'PLAYERS' | 'CREATORS';

export interface Marker {
  id: number;
  at: string;
  label: string;
  channel: string | null;
  url: string | null;
  audience: MarkerAudience;
  /** The game to play, or for creators the game to fork. */
  releaseId: number | null;
  game: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerInput {
  at: string;
  label: string;
  channel?: string | null;
  url?: string | null;
  audience?: MarkerAudience;
  releaseId?: number | null;
}
