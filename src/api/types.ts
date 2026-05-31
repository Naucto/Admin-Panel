export type AccountStatus = "ACTIVE" | "SUSPENDED" | "BANNED";
export type ProjectStatus = "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
export type MonetizationType = "NONE" | "ADS" | "PAID";
export type ReportTargetType = "USER" | "PROJECT" | "COMMENT";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export type ModerationTargetType = "USER" | "PROJECT" | "COMMENT" | "REPORT";
export type ModerationActionType =
  | "SUSPEND_USER"
  | "BAN_USER"
  | "RESTORE_USER"
  | "HIDE_PROJECT"
  | "RESTORE_PROJECT"
  | "UNPUBLISH_PROJECT"
  | "HIDE_COMMENT"
  | "RESTORE_COMMENT"
  | "REVIEW_REPORT"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT"
  | "ANONYMIZE_USER"
  | "HARD_DELETE_USER"
  | "CREATE_STAFF_USER"
  | "UPDATE_ROLES"
  | "EDIT_USER"
  | "EDIT_PROJECT"
  | "EDIT_COMMENT"
  | "UPDATE_REPORT"
  | "RESET_PASSWORD"
  | "CREATE_ROLE"
  | "RENAME_ROLE"
  | "DELETE_ROLE";

export type StaffRole = "Admin" | "Moderator";

export type AdminMe = {
  id: number;
  email: string;
  username: string;
  nickname: string | null;
  accountStatus: AccountStatus;
  roles: string[];
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
};

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  nickname: string | null;
  accountStatus: AccountStatus;
  roles: string[];
  createdAt: string;
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedById: number | null;
};

export type AdminUserDetail = AdminUser & {
  projectsCreatedCount: number;
  commentsCount: number;
  reportsFiledCount: number;
  moderationActionsTakenCount: number;
};

export type AdminProject = {
  id: number;
  name: string;
  shortDesc: string;
  longDesc: string | null;
  tags: string[];
  publishedTags: string[];
  publishedName: string | null;
  publishedShortDesc: string | null;
  publishedLongDesc: string | null;
  status: ProjectStatus | null;
  iconUrl: string | null;
  monetization: MonetizationType | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  userId: number;
  hidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  hiddenById: number | null;
  viewCount: number;
  likes: number;
};

export type AdminComment = {
  id: number;
  projectId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  deleted: boolean;
  hidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  hiddenById: number | null;
  createdAt: string;
  authorUsername?: string;
  projectName?: string;
};

export type AdminReport = {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  targetLabel: string;
  reporterId: number;
  reporterUsername?: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReportDetail = AdminReport & {
  moderationActions: Array<{
    id: number;
    action: ModerationActionType;
    actorId: number | null;
    targetType: ModerationTargetType;
    targetId: number;
    reason: string | null;
    createdAt: string;
  }>;
};

export type AdminRole = {
  id: number;
  name: string;
  userCount: number;
  canonical: boolean;
};

export type ModerationLogEntry = {
  id: number;
  actorId: number | null;
  actorLabel: string | null;
  targetType: ModerationTargetType;
  targetId: number;
  targetLabel: string;
  action: ModerationActionType;
  reason: string | null;
  reportId: number | null;
  createdAt: string;
};

export type ModerationLogDetail = ModerationLogEntry & {
  before?: unknown;
  after?: unknown;
};

export type PaginatedList<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export type DashboardData = {
  current: {
    players: number;
    creators: number;
    activeGameSessions: number;
    activeWorkSessions: number;
  };
  totals: {
    users: number;
    activeUsers: number;
    suspendedUsers: number;
    bannedUsers: number;
    totalProjects: number;
    publishedProjects: number;
    hiddenProjects: number;
    totalViews: number;
    totalProjectLikes: number;
    comments: number;
    deletedComments: number;
    hiddenComments: number;
    openReports: number;
    reportsLast7Days: number;
    moderationActionsLast7Days: number;
    likes: number;
    totalGameSessions: number;
    endedGameSessions: number;
    totalWorkSessions: number;
    eventsLast24Hours: number;
  };
  breakdowns: {
    accounts: Array<{ name: string; value: number }>;
    projects: Array<{ name: string; value: number }>;
    reports: Array<{ name: string; value: number }>;
    moderationActions: Array<{ name: string; value: number }>;
  };
  top: {
    activeGames: Array<{ projectId: number; name: string; players: number; views: number; likes: number; value: number }>;
    activeCreationProjects: Array<{ projectId: number; name: string; creators: number; value: number }>;
    byViews: Array<{ projectId: number; name: string; value: number; views: number; likes: number }>;
    byLikes: Array<{ projectId: number; name: string; value: number; views: number; likes: number }>;
    byPlays: Array<{ projectId: number; name: string; value: number; views: number; likes: number; comments: number }>;
    byComments: Array<{ projectId: number; name: string; value: number; views: number; likes: number; comments: number }>;
  };
  recentReports: Array<{
    id: number;
    targetType: ReportTargetType;
    targetId: number;
    status: ReportStatus;
    reason: string;
    createdAt: string;
    targetLabel: string;
  }>;
  daily: Array<{
    date: string;
    accountsCreated: number;
    logins: number;
    projectsCreated: number;
    projectsPublished: number;
    projectsUnpublished: number;
    commentsCreated: number;
    likesCreated: number;
    likesRemoved: number;
    gameViews: number;
    gameSessionsStarted: number;
    gameSessionsEnded: number;
    workSessionsStarted: number;
    workSessionsJoined: number;
    workSessionsLeft: number;
  }>;
};

export type LiveActivityData = {
  metrics: {
    activePlayers: number;
    activeGameSessions: number;
    activeCreators: number;
    activeWorkSessions: number;
    gamesToday: number;
    games7Days: number;
    gamesAllTime: number;
    workToday: number;
    work7Days: number;
    workAllTime: number;
  };
  activeGames: Array<{
    id: number;
    projectId: number;
    name: string;
    players: number;
    views: number;
    likes: number;
    startedAt: string;
  }>;
  activeWork: Array<{
    id: number;
    projectId: number;
    name: string;
    creators: number;
    startedAt: string;
    lastActiveAt: string;
  }>;
  recentGames: Array<{
    id: number;
    projectId: number;
    name: string;
    players: number;
    startedAt: string;
    endedAt: string | null;
  }>;
};

export type SocialOverviewData = {
  metrics: {
    likes: number;
    comments: number;
    visibleComments: number;
    deletedComments: number;
    hiddenComments: number;
    friendships: number;
    friendRequests: number;
    subscriptions: number;
    activeSubscriptions: number;
  };
  commentBreakdown: Array<{ name: string; value: number }>;
  topLikedGames: Array<{ projectId: number; name: string; likes: number; views: number; value: number }>;
  topCommentedGames: Array<{ projectId: number; name: string; value: number; views: number; likes: number; comments: number }>;
};
