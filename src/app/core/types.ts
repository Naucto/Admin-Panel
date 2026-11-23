/**
 * The backend's `admin/*` contract, as its OpenAPI document states it (`swagger.json` in the
 * Backend repo). Kept by hand: the panel reads a dozen routes and no generated client is published.
 *
 * Every id is a UUID in lower case. It names one thing and says nothing else: ids are compared for
 * equality, never ordered and never computed on.
 */

export type Grain = 'DAY' | 'WEEK' | 'MONTH';
export type PointStatus = 'final' | 'provisional' | 'unavailable';
export type RoleName = 'User' | 'Viewer' | 'Moderator' | 'Admin';

/**
 * Whom a metric can count: browsers that accepted analytics, tabs that refused it or never
 * answered, both, or what the server records for every account.
 */
export type Population = 'CONSENTED' | 'ANONYMOUS' | 'CONSENTED_AND_ANONYMOUS' | 'SERVER';

export interface MetricInfo {
  name: string;
  population: Population;
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
  from: string;
  to: string;
  status: PointStatus;
  /** Days of the range whose values are no longer kept, left out of the values. */
  missingDays: number;
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
  releaseId: string;
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
  releaseId: string;
  name: string | null;
  plays: number;
  playtimeMs: number;
  /** Null over a range reaching before the raw data kept: distinct players cannot be added. */
  players: number | null;
  mpSessions: number;
}

export interface Games {
  from: string;
  to: string;
  status: PointStatus;
  missingDays: number;
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
  id: string;
  username: string;
  nickname: string | null;
  /** Null for a reader who does not read addresses: anyone but an admin. */
  email: string | null;
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
  population: Population;
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
  releaseId: string | null;
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
  releaseId: string;
  name: string | null;
  players: number;
  plays: number;
  anonymousPlays: number;
}

export interface PlayedGame {
  releaseId: string;
  /** Null for a game since deleted. */
  name: string | null;
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
  /** The games played, most first. */
  games: PlayedGame[];
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
  releaseId: string;
  name: string;
  /** Null for a project not published, such as a fork. */
  publishedAt: string | null;
}

/** A game chosen in a picker: its id, and the name it had when chosen. */
export interface GameChoice {
  releaseId: string;
  name: string;
}

export type MarkerAudience = 'EVERYONE' | 'PLAYERS' | 'CREATORS';

export interface Marker {
  id: string;
  at: string;
  label: string;
  channel: string | null;
  url: string | null;
  audience: MarkerAudience;
  /** The game to play, or for creators the game to fork. */
  releaseId: string | null;
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
  releaseId?: string | null;
}

/** What the person said they mostly do on Naucto. */
export type ReportRole = 'PLAYER' | 'CREATOR';
export type RatingOrigin = 'PROMPT' | 'MANUAL';
export type ReportKind = 'RATING' | 'BUG' | 'CRASH';
export type ReportStatus = 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED';
export type RatingReason =
  'BUGS' | 'PERFORMANCE' | 'HARD_TO_USE' | 'MISSING_FEATURE' | 'CONTENT' | 'OTHER';

export interface FeedbackAccount {
  id: string;
  username: string;
  nickname: string | null;
  /** Null for a reader who does not read addresses: anyone but an admin. */
  email: string | null;
  role: RoleName;
  createdAt: string;
  /** The public profile on the web app, or null once the account is deleted. */
  profileUrl: string | null;
  deleted: boolean;
}

export interface FeedbackRelease {
  id: string;
  name: string;
}

export interface Rating {
  id: string;
  score: number;
  reasons: RatingReason[];
  liked: string | null;
  improve: string | null;
  role: ReportRole;
  origin: RatingOrigin;
  createdAt: string;
  account: FeedbackAccount;
  /** The game played just before a prompt. */
  release: FeedbackRelease | null;
  bugReportIds: string[];
}

export interface RatingList {
  items: Rating[];
  total: number;
  page: number;
  limit: number;
}

export interface RatingQuery {
  role?: ReportRole;
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
export type BugStatus = ReportStatus;
/** OPEN is anything not closed. CLOSED is resolved or ignored. */
export type BugView = 'NEW' | 'OPEN' | 'CLOSED' | 'ALL';

export interface BugSummary {
  id: string;
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
  console?: string[];
  device?: string | null;
  browser?: string | null;
  os?: string | null;
}

export interface BugDetail extends BugSummary {
  description: string;
  route: string;
  projectId: string | null;
  context: BugContext;
  adminNote: string | null;
  rating: { id: string; score: number; liked: string | null; improve: string | null } | null;
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
  id: string;
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
  id: string;
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

/** One report as `/admin/reports` answers it. The fields of the other kinds are null. */
export interface AdminReport {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  account: FeedbackAccount | null;
  role: ReportRole | null;
  route: string | null;
  release: FeedbackRelease | null;
  appRelease: string | null;
  title: string | null;
  message: string | null;
  score: number | null;
  reasons: RatingReason[];
  liked: string | null;
  improve: string | null;
  origin: RatingOrigin | null;
  followUpIds: string[];
  category: BugCategory | null;
  ratingId: string | null;
  hasScreenshot: boolean;
  source: CrashSource | null;
  count: number;
  lastSeen: string | null;
  regressedAt: string | null;
}

export interface AdminReportDetail extends AdminReport {
  adminNote: string | null;
  projectId: string | null;
  context: Record<string, unknown> | null;
  rating: BugDetail['rating'];
  screenshot: BugDetail['screenshot'];
  stack: string | null;
  occurrences: CrashEvent[];
}

export interface AdminReportList {
  items: AdminReport[];
  total: number;
  page: number;
  limit: number;
}

/* Moderation: the backend's `admin/moderation/*` responses. */

export type ModerationTargetType = 'USER' | 'PROJECT' | 'COMMENT';

export type ModerationReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE'
  | 'SEXUAL_CONTENT'
  | 'VIOLENCE'
  | 'ILLEGAL'
  | 'IMPERSONATION'
  | 'STOLEN_CONTENT'
  | 'OTHER';

export type FlagStatus = 'OPEN' | 'ACTIONED' | 'DISMISSED';

export type ModerationActionType =
  | 'ACCOUNT_WARNED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REINSTATED'
  | 'ACCOUNT_DELETED'
  | 'PROFILE_CLEARED'
  | 'ROLE_CHANGED'
  | 'PROJECT_HIDDEN'
  | 'PROJECT_RESTORED'
  | 'PROJECT_DELETED'
  | 'COMMENT_HIDDEN'
  | 'COMMENT_RESTORED'
  | 'COMMENT_DELETED'
  | 'FLAGS_DISMISSED'
  | 'DRAFT_VIEWED';

/** Where a target stands. Which values a target can take depends on what it is. */
export type TargetState = 'VISIBLE' | 'UNPUBLISHED' | 'HIDDEN' | 'SUSPENDED' | 'DELETED' | 'GONE';

/**
 * What the signed-in staff member may do about a target, as the backend decided it. HIDE, RESTORE
 * and DELETE bear on the game or the comment, the others on the account that owns it.
 */
export type ModerationOperation =
  | 'DISMISS'
  | 'HIDE'
  | 'RESTORE'
  | 'DELETE'
  | 'WARN'
  | 'SUSPEND'
  | 'REINSTATE'
  | 'CLEAR_PROFILE'
  | 'DELETE_ACCOUNT';

export type CaseView = 'OPEN' | 'RESOLVED' | 'ALL';
export type CaseSort = 'lastFlagged' | 'flags';
export type CaseStatus = 'OPEN' | 'RESOLVED';
export type AccountStanding = 'GOOD' | 'WARNED' | 'SUSPENDED';
export type ProjectModerationState = 'PUBLISHED' | 'UNPUBLISHED' | 'HIDDEN';
export type CommentModerationState = 'VISIBLE' | 'HIDDEN' | 'DELETED';
export type ProfilePart = 'NICKNAME' | 'DESCRIPTION' | 'PICTURE' | 'BACKGROUND';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** An account as a moderation screen names it. */
export interface ModerationAccountRef {
  id: string;
  username: string;
  nickname: string | null;
  role: RoleName;
  deleted: boolean;
  profileUrl: string | null;
  email: string | null;
}

/** The text of a game, a comment or a profile at one moment. */
export interface TargetContent {
  title: string | null;
  body: string | null;
}

export interface ModerationAction {
  id: string;
  action: ModerationActionType;
  actor: ModerationAccountRef;
  targetType: ModerationTargetType;
  targetId: string;
  targetLabel: string | null;
  subject: ModerationAccountRef | null;
  reason: ModerationReason | null;
  publicMessage: string | null;
  internalNote: string | null;
  snapshot: TargetContent | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CaseTarget {
  type: ModerationTargetType;
  id: string;
  state: TargetState;
  label: string | null;
  owner: ModerationAccountRef | null;
  projectId: string | null;
  projectName: string | null;
  playUrl: string | null;
  previewPlayUrl: string | null;
  previewEditUrl: string | null;
}

export interface CaseSummary {
  target: CaseTarget;
  status: CaseStatus;
  openFlags: number;
  totalFlags: number;
  reasons: ModerationReason[];
  firstFlaggedAt: string;
  lastFlaggedAt: string;
}

export interface CaseFlag {
  id: string;
  reporter: ModerationAccountRef;
  reason: ModerationReason;
  details: string | null;
  snapshot: TargetContent;
  status: FlagStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: ModerationAccountRef | null;
}

export interface CaseDetail extends CaseSummary {
  current: TargetContent | null;
  flags: CaseFlag[];
  history: ModerationAction[];
  ownerHistory: ModerationAction[];
  allowedActions: ModerationOperation[];
}

export interface OpenCaseCount {
  openCases: number;
  openFlags: number;
}

export interface Suspension {
  since: string;
  until: string | null;
}

export interface ModerationAccount extends ModerationAccountRef {
  createdAt: string;
  standing: AccountStanding;
  suspension: Suspension | null;
  warnings: number;
  games: number;
  comments: number;
  openFlags: number;
  flagsFiled: number;
}

export interface ModerationAccountDetail extends ModerationAccount {
  description: string | null;
  allowedActions: ModerationOperation[];
}

export interface ModerationProject {
  id: string;
  name: string;
  shortDesc: string;
  owner: ModerationAccountRef;
  state: ProjectModerationState;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  hiddenAt: string | null;
  openFlags: number;
  playUrl: string | null;
  previewPlayUrl: string;
  previewEditUrl: string;
}

export interface ModerationProjectDetail extends ModerationProject {
  longDesc: string | null;
  tags: string[];
  collaborators: ModerationAccountRef[];
  forkedFromId: string | null;
  hasCover: boolean;
  allowedActions: ModerationOperation[];
}

export interface ModerationComment {
  id: string;
  content: string;
  author: ModerationAccountRef;
  projectId: string;
  projectName: string;
  parentId: string | null;
  state: CommentModerationState;
  createdAt: string;
  hiddenAt: string | null;
  openFlags: number;
  playUrl: string | null;
  allowedActions: ModerationOperation[];
}

/** What a decision sends. Which fields a given decision takes is `core/moderation-format.ts`'s to say. */
export interface ModerationDecision {
  reason?: ModerationReason;
  publicMessage?: string;
  internalNote?: string;
  resolveFlags?: boolean;
  durationDays?: number;
  parts?: ProfilePart[];
  confirmation?: 'DELETE';
  removePublishedGames?: boolean;
}
