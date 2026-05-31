import { apiClient } from "./client";
import type {
  AccountStatus,
  AdminComment,
  AdminMe,
  AdminProject,
  AdminReport,
  AdminReportDetail,
  AdminRole,
  AdminUser,
  AdminUserDetail,
  DashboardData,
  LiveActivityData,
  ModerationActionType,
  ModerationLogDetail,
  ModerationLogEntry,
  ModerationTargetType,
  MonetizationType,
  PaginatedList,
  PaginationParams,
  ProjectStatus,
  ReportStatus,
  ReportTargetType,
  SocialOverviewData
} from "./types";

function buildParams(input: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  return params;
}

// ─── Auth ────────────────────────────────────────────────────────────────

export const adminAuthApi = {
  login: (email: string, password: string) =>
    apiClient.post<AdminMe>("/admin/auth/login", { email, password }).then((r) => r.data),
  refresh: () => apiClient.post<AdminMe>("/admin/auth/refresh").then((r) => r.data),
  logout: () => apiClient.post<{ success: true }>("/admin/auth/logout").then((r) => r.data),
  me: () => apiClient.get<AdminMe>("/admin/auth/me").then((r) => r.data)
};

// ─── Insights ────────────────────────────────────────────────────────────

export const adminInsightsApi = {
  dashboard: (days = 30) =>
    apiClient
      .get<DashboardData>("/admin/insights/dashboard", { params: { days } })
      .then((r) => r.data),
  live: () => apiClient.get<LiveActivityData>("/admin/insights/live").then((r) => r.data),
  social: () =>
    apiClient.get<SocialOverviewData>("/admin/insights/social").then((r) => r.data)
};

// ─── Users ───────────────────────────────────────────────────────────────

export type AdminUserFilter = PaginationParams & {
  email?: string;
  username?: string;
  nickname?: string;
  accountStatus?: AccountStatus;
  role?: string;
};

export const adminUserApi = {
  list: (filter: AdminUserFilter) =>
    apiClient
      .get<PaginatedList<AdminUser>>("/admin/users", { params: buildParams(filter) })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data),
  create: (data: {
    email: string;
    username: string;
    nickname?: string;
    password: string;
    roles: string[];
  }) => apiClient.post<AdminUser>("/admin/users", data).then((r) => r.data),
  update: (
    id: number,
    data: {
      email?: string;
      username?: string;
      nickname?: string | null;
      roles?: string[];
      reason?: string;
    }
  ) => apiClient.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),
  remove: (id: number, reason?: string) =>
    apiClient
      .delete<{ success: true }>(`/admin/users/${id}`, { data: { reason } })
      .then((r) => r.data),
  suspend: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminUser>(`/admin/users/${id}/suspend`, { reason, reportId })
      .then((r) => r.data),
  ban: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminUser>(`/admin/users/${id}/ban`, { reason, reportId })
      .then((r) => r.data),
  restore: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminUser>(`/admin/users/${id}/restore`, { reason, reportId })
      .then((r) => r.data),
  grantModerator: (id: number, reason?: string) =>
    apiClient
      .post<AdminUser>(`/admin/users/${id}/roles/moderator`, { reason })
      .then((r) => r.data),
  revokeModerator: (id: number, reason?: string) =>
    apiClient
      .delete<AdminUser>(`/admin/users/${id}/roles/moderator`, { data: { reason } })
      .then((r) => r.data),
  resetPassword: (id: number, newPassword: string, reason?: string) =>
    apiClient
      .post<{ success: true }>(`/admin/users/${id}/reset-password`, {
        newPassword,
        reason
      })
      .then((r) => r.data)
};

// ─── Projects ────────────────────────────────────────────────────────────

export type AdminProjectFilter = PaginationParams & {
  name?: string;
  status?: ProjectStatus;
  hidden?: boolean;
  userId?: number;
};

export const adminProjectApi = {
  list: (filter: AdminProjectFilter) =>
    apiClient
      .get<PaginatedList<AdminProject>>("/admin/projects", {
        params: buildParams(filter)
      })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AdminProject>(`/admin/projects/${id}`).then((r) => r.data),
  update: (
    id: number,
    data: {
      name?: string;
      shortDesc?: string;
      longDesc?: string | null;
      publishedName?: string | null;
      publishedShortDesc?: string | null;
      publishedLongDesc?: string | null;
      tags?: string[];
      publishedTags?: string[];
      iconUrl?: string | null;
      monetization?: MonetizationType;
      price?: number | null;
      hiddenReason?: string | null;
      reason?: string;
    }
  ) =>
    apiClient.patch<AdminProject>(`/admin/projects/${id}`, data).then((r) => r.data),
  hide: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminProject>(`/admin/projects/${id}/hide`, { reason, reportId })
      .then((r) => r.data),
  restore: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminProject>(`/admin/projects/${id}/restore`, { reason, reportId })
      .then((r) => r.data),
  unpublish: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminProject>(`/admin/projects/${id}/unpublish`, { reason, reportId })
      .then((r) => r.data)
};

// ─── Comments ────────────────────────────────────────────────────────────

export type AdminCommentFilter = PaginationParams & {
  projectId?: number;
  authorId?: number;
  hidden?: boolean;
  deleted?: boolean;
};

export const adminCommentApi = {
  list: (filter: AdminCommentFilter) =>
    apiClient
      .get<PaginatedList<AdminComment>>("/admin/comments", {
        params: buildParams(filter)
      })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AdminComment>(`/admin/comments/${id}`).then((r) => r.data),
  update: (id: number, content: string, reason?: string) =>
    apiClient
      .patch<AdminComment>(`/admin/comments/${id}`, { content, reason })
      .then((r) => r.data),
  hide: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminComment>(`/admin/comments/${id}/hide`, { reason, reportId })
      .then((r) => r.data),
  restore: (id: number, reason?: string, reportId?: number) =>
    apiClient
      .post<AdminComment>(`/admin/comments/${id}/restore`, { reason, reportId })
      .then((r) => r.data)
};

// ─── Reports ─────────────────────────────────────────────────────────────

export type AdminReportFilter = PaginationParams & {
  targetType?: ReportTargetType;
  targetId?: number;
  status?: ReportStatus;
  reporterId?: number;
};

export const adminReportApi = {
  list: (filter: AdminReportFilter) =>
    apiClient
      .get<PaginatedList<AdminReport>>("/admin/reports", {
        params: buildParams(filter)
      })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AdminReportDetail>(`/admin/reports/${id}`).then((r) => r.data),
  updateNote: (id: number, resolutionNote: string | null) =>
    apiClient
      .patch<AdminReportDetail>(`/admin/reports/${id}`, { resolutionNote })
      .then((r) => r.data),
  review: (id: number, resolutionNote?: string) =>
    apiClient
      .post<AdminReportDetail>(`/admin/reports/${id}/review`, { resolutionNote })
      .then((r) => r.data),
  resolve: (id: number, resolutionNote?: string) =>
    apiClient
      .post<AdminReportDetail>(`/admin/reports/${id}/resolve`, { resolutionNote })
      .then((r) => r.data),
  dismiss: (id: number, resolutionNote?: string) =>
    apiClient
      .post<AdminReportDetail>(`/admin/reports/${id}/dismiss`, { resolutionNote })
      .then((r) => r.data)
};

// ─── Moderation Log ──────────────────────────────────────────────────────

export type ModerationLogFilter = PaginationParams & {
  actorId?: number;
  targetType?: ModerationTargetType;
  targetId?: number;
  action?: ModerationActionType;
  createdAfter?: string;
  createdBefore?: string;
};

export const adminModerationLogApi = {
  list: (filter: ModerationLogFilter) =>
    apiClient
      .get<PaginatedList<ModerationLogEntry>>("/admin/moderation-log", {
        params: buildParams(filter)
      })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient
      .get<ModerationLogDetail>(`/admin/moderation-log/${id}`)
      .then((r) => r.data)
};

// ─── Roles ───────────────────────────────────────────────────────────────

export const adminRoleApi = {
  list: () => apiClient.get<AdminRole[]>("/admin/roles").then((r) => r.data),
  create: (name: string, reason?: string) =>
    apiClient.post<AdminRole>("/admin/roles", { name, reason }).then((r) => r.data),
  rename: (id: number, name: string, reason?: string) =>
    apiClient
      .patch<AdminRole>(`/admin/roles/${id}`, { name, reason })
      .then((r) => r.data),
  remove: (id: number, reason?: string) =>
    apiClient
      .delete<{ success: true }>(`/admin/roles/${id}`, { data: { reason } })
      .then((r) => r.data)
};

// ─── Lookup ──────────────────────────────────────────────────────────────

export const adminLookupApi = {
  likes: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/likes", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  friendships: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/friendships", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  friendRequests: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/friend-requests", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  subscriptions: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/subscriptions", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  gameSessions: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/game-sessions", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  workSessions: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/work-sessions", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  analyticsEvents: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/analytics-events", {
        params: buildParams(params)
      })
      .then((r) => r.data),
  dailyRollups: (params: PaginationParams) =>
    apiClient
      .get<PaginatedList<Record<string, unknown>>>("/admin/lookup/daily-rollups", {
        params: buildParams(params)
      })
      .then((r) => r.data)
};
