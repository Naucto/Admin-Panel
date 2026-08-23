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
  PaginatedMeta,
  PaginationParams,
  ProjectStatus,
  ReportStatus,
  ReportTargetType,
  SocialOverviewData,
  StaffRole
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

/**
 * `/users` returns roles as `{ id, name }` records, which is the shape the
 * public site needs. The panel only ever displays or tests role names, so it
 * flattens them once here rather than at every call site -- rendering the raw
 * record is what crashed the users table.
 */
type RawUser<T> = Omit<T, "roles"> & {
  roles?: Array<{ id: number; name: string }> | string[] | null;
};

function withRoleNames<T extends { roles: string[] }>(user: RawUser<T>): T {
  const roles = (user.roles ?? []).map((role) =>
    typeof role === "string" ? role : role.name
  );

  return { ...user, roles } as T;
}

export const adminUserApi = {
  // /users serves the staff view: it returns roles and refuses the moderation
  // filters to non-staff, so there is no /admin mirror of it.
  list: (filter: AdminUserFilter) =>
    apiClient
      .get<{ data: Array<RawUser<AdminUser>>; meta: PaginatedMeta }>("/users", {
        params: buildParams(filter)
      })
      .then((r) => ({
        data: r.data.data.map(withRoleNames<AdminUser>),
        meta: r.data.meta
      })),
  get: (id: number) =>
    apiClient
      .get<{ data: RawUser<AdminUserDetail> }>(`/users/${id}`)
      .then((r) => withRoleNames<AdminUserDetail>(r.data.data)),
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
  remove: (id: number) =>
    apiClient.delete<{ success: true }>(`/users/${id}`).then((r) => r.data),
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
  grantRole: (id: number, role: StaffRole, reason?: string) =>
    apiClient
      .post<AdminUser>(`/admin/users/${id}/roles/${role}`, { reason })
      .then((r) => r.data),
  revokeRole: (id: number, role: StaffRole, reason?: string) =>
    apiClient
      .delete<AdminUser>(`/admin/users/${id}/roles/${role}`, { data: { reason } })
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
  // These go through the ordinary project routes, not an /admin mirror of them:
  // the backend lets a moderator act on anyone's project and records it in the
  // audit log, so a second set of endpoints would only be duplication.
  list: (filter: AdminProjectFilter) =>
    apiClient
      .get<{
        projects: AdminProject[];
        total: number;
        page: number;
        limit: number;
      }>("/projects", {
        // scope=all drops the ownership clause; moderators only.
        params: buildParams({ ...filter, scope: "all" })
      })
      .then((r) => ({
        data: r.data.projects,
        meta: {
          page: r.data.page,
          limit: r.data.limit,
          total: r.data.total,
          totalPages: Math.max(1, Math.ceil(r.data.total / r.data.limit))
        }
      })),
  get: (id: number) =>
    apiClient.get<AdminProject>(`/projects/${id}`).then((r) => r.data),
  update: (
    id: number,
    data: {
      name?: string;
      shortDesc?: string;
      longDesc?: string | null;
      tags?: string[];
      iconUrl?: string | null;
      monetization?: MonetizationType;
      price?: number | null;
      hidden?: boolean;
      moderationReason?: string;
    }
  ) => apiClient.put<AdminProject>(`/projects/${id}`, data).then((r) => r.data),
  hide: (id: number, reason?: string) =>
    apiClient
      .put<AdminProject>(`/projects/${id}`, {
        hidden: true,
        moderationReason: reason
      })
      .then((r) => r.data),
  restore: (id: number, reason?: string) =>
    apiClient
      .put<AdminProject>(`/projects/${id}`, {
        hidden: false,
        moderationReason: reason
      })
      .then((r) => r.data),
  unpublish: (id: number) =>
    apiClient.post<void>(`/projects/${id}/unpublish`).then((r) => r.data)
};

export type AdminCommentFilter = PaginationParams & {
  projectId?: number;
  authorId?: number;
  hidden?: boolean;
  deleted?: boolean;
};

export const adminCommentApi = {
  list: (filter: AdminCommentFilter) =>
    apiClient
      .get<PaginatedList<AdminComment>>("/comments", {
        params: buildParams(filter)
      })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AdminComment>(`/comments/${id}`).then((r) => r.data),
  update: (
    projectId: number,
    id: number,
    patch: { content?: string; hidden?: boolean; moderationReason?: string }
  ) =>
    apiClient
      .put<AdminComment>(`/projects/${projectId}/comments/${id}`, patch)
      .then((r) => r.data),
  hide: (projectId: number, id: number, reason?: string) =>
    apiClient
      .put<AdminComment>(`/projects/${projectId}/comments/${id}`, {
        hidden: true,
        moderationReason: reason
      })
      .then((r) => r.data),
  restore: (projectId: number, id: number, reason?: string) =>
    apiClient
      .put<AdminComment>(`/projects/${projectId}/comments/${id}`, {
        hidden: false,
        moderationReason: reason
      })
      .then((r) => r.data),
  remove: (projectId: number, id: number) =>
    apiClient
      .delete<void>(`/projects/${projectId}/comments/${id}`)
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

// ─── Audit log ───────────────────────────────────────────────────────────

export type ModeratableType = "USER" | "PROJECT" | "COMMENT";

export const auditApi = {
  /** History for any moderatable thing: a project, a comment, a user. */
  historyOf: (targetType: ModeratableType, targetId: number, params: PaginationParams = {}) =>
    apiClient
      .get<PaginatedList<ModerationLogEntry>>(
        `/moderation-log/${targetType}/${targetId}`,
        { params: buildParams(params) }
      )
      .then((r) => r.data)
};
