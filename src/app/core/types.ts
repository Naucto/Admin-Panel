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

export type FeedbackContext = 'PLAYER' | 'CREATOR';
export type FeedbackSource = 'PROMPT' | 'MANUAL';
export type RatingReason =
  'BUGS' | 'PERFORMANCE' | 'HARD_TO_USE' | 'MISSING_FEATURE' | 'CONTENT' | 'OTHER';

export interface FeedbackAccount {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  role: RoleName;
  createdAt: string;
  /** The public profile on the web app, or null once the account is deleted. */
  profileUrl: string | null;
  deleted: boolean;
}

export interface FeedbackRelease {
  id: number;
  name: string;
}

export interface Rating {
  id: number;
  score: number;
  reasons: RatingReason[];
  liked: string | null;
  improve: string | null;
  context: FeedbackContext;
  source: FeedbackSource;
  appRelease: string | null;
  createdAt: string;
  account: FeedbackAccount;
  /** The game played just before a prompt. */
  release: FeedbackRelease | null;
  bugReportIds: number[];
}

export interface RatingList {
  items: Rating[];
  total: number;
  page: number;
  limit: number;
}

export interface RatingQuery {
  context?: FeedbackContext;
  maxScore?: number;
  withComments?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RatingAverage {
  count: number;
  average: number | null;
}

export interface RatingBucket extends RatingAverage {
  /** First day of the period. */
  start: string;
}

export interface RatingSummary extends RatingAverage {
  /** Share of scores of 4 or less, from 0 to 1. */
  lowShare: number | null;
  /** How many ratings gave each score, 1 to 10. */
  distribution: number[];
  player: RatingAverage;
  creator: RatingAverage;
  series: RatingBucket[];
}

export type BugCategory =
  'GAMEPLAY' | 'EDITOR' | 'GRAPHICS' | 'SOUND' | 'NETPLAY' | 'ACCOUNT' | 'PERFORMANCE' | 'OTHER';
export type BugStatus = 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX' | 'DUPLICATE';
/** OPEN is anything not closed. CLOSED is resolved, declined or duplicate. */
export type BugView = 'NEW' | 'OPEN' | 'CLOSED' | 'ALL';

export interface BugSummary {
  id: number;
  title: string;
  category: BugCategory;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
  account: FeedbackAccount;
  release: FeedbackRelease | null;
  hasScreenshot: boolean;
}

export interface BugList {
  items: BugSummary[];
  total: number;
  page: number;
  limit: number;
}

/** What the browser attached. Stored as sent, so every field may be missing. */
export interface BugContext {
  viewport?: string;
  appRelease?: string;
  language?: string;
  engineError?: string;
  appError?: string;
  console?: string[];
  device?: string | null;
  browser?: string | null;
  os?: string | null;
}

export interface BugDetail extends BugSummary {
  description: string;
  route: string;
  projectId: number | null;
  context: BugContext;
  adminNote: string | null;
  rating: { id: number; score: number; liked: string | null; improve: string | null } | null;
  screenshot: { mime: string; bytes: number } | null;
}

export interface BugUpdate {
  status: BugStatus;
  adminNote?: string | null;
}

export type CrashSource = 'WEB' | 'ENGINE' | 'BACKEND';
export type CrashStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';
export type CrashSort = 'lastSeen' | 'count';

export interface CrashGroup {
  id: number;
  fingerprint: string;
  source: CrashSource;
  name: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  lastRelease: string | null;
  status: CrashStatus;
  /** When a resolved group was last reported again. */
  regressedAt: string | null;
}

export interface CrashList {
  items: CrashGroup[];
  total: number;
  page: number;
  limit: number;
}

export interface CrashQuery {
  source?: CrashSource;
  status?: CrashStatus;
  sort?: CrashSort;
  page?: number;
  limit?: number;
}

export interface CrashEvent {
  id: number;
  createdAt: string;
  route: string;
  appRelease: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  extra: Record<string, unknown> | null;
}

export interface CrashDetail extends CrashGroup {
  lastStack: string;
  /** The latest occurrences, newest first. */
  events: CrashEvent[];
}
