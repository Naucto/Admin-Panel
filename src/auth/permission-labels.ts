import type { Permission } from "@api/types";

export const PERMISSION_LABELS: Record<Permission, string> = {
  MODERATE_CONTENT: "Moderate projects and comments",
  MODERATE_USERS: "Suspend and restore accounts",
  MANAGE_REPORTS: "Manage reports",
  VIEW_AUDIT: "View moderation history",
  VIEW_INSIGHTS: "View dashboard",
  VIEW_ACTIVITY: "View activity and social metrics",
  MANAGE_USERS: "Manage accounts and passwords",
  MANAGE_ROLES: "Manage roles and permissions"
};
