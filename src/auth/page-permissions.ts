import type { Permission } from "@api/types";

export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  reports: ["MANAGE_REPORTS"],
  projects: ["MODERATE_CONTENT"],
  comments: ["MODERATE_CONTENT"],
  users: ["MODERATE_USERS", "MANAGE_USERS", "MANAGE_ROLES"],
  "moderation-log": ["VIEW_AUDIT"],
  roles: ["MANAGE_ROLES"],
  access: ["MANAGE_ROLES"],
  live: ["VIEW_ACTIVITY"],
  social: ["VIEW_ACTIVITY"]
};
