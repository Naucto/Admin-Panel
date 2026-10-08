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

export interface Health {
  ingest: { accepted: number; rejected: number; throttled: number; writeErrors: number };
  finalization: { finalization: string; lastFinalDay?: string | null }[];
  projectionBacklog: number;
  oldestProjectionWork: string | null;
  oldestRawDay: string | null;
}

export interface AccountSummary {
  id: number;
  username: string;
  nickname: string | null;
  email: string;
  role: RoleName;
  createdAt: string;
}

export interface AdminAccount extends AccountSummary {
  twoFactorEnabled: boolean;
  twoFactorEnabledAt: string | null;
}

export interface AdminMe extends AdminAccount {
  sessionVerified: boolean;
}

export interface AdminSession {
  status: 'authenticated' | 'two_factor_required';
  accessToken?: string;
  expiresIn?: number;
  challengeToken?: string;
  account?: AdminAccount;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
  setupToken: string;
}
