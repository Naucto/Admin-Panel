import type { RoleName } from './types';

/** The parts of the console a role may or may not open. */
export type Area = 'stats' | 'support' | 'moderation' | 'administration';

/**
 * What each staff role opens. A moderator works the moderation queue and nothing else. A viewer
 * opens everything and changes nothing. The backend decides all of this again on every request:
 * this only keeps the console from drawing what would be refused.
 */
const AREAS: Record<RoleName, readonly Area[]> = {
  User: [],
  Viewer: ['stats', 'support', 'moderation', 'administration'],
  Moderator: ['moderation'],
  Admin: ['stats', 'support', 'moderation', 'administration'],
};

export function canOpen(role: RoleName | null, area: Area): boolean {
  return role !== null && AREAS[role].includes(area);
}

/** Whether a role changes anything at all. A viewer observes. */
export function canAct(role: RoleName | null): boolean {
  return role === 'Moderator' || role === 'Admin';
}

/** Whether a role does what only an admin does: delete for good, grant roles, triage support. */
export function isAdmin(role: RoleName | null): boolean {
  return role === 'Admin';
}

const ROLE_LABELS: Record<RoleName, string> = {
  User: 'User',
  Viewer: 'Viewer',
  Moderator: 'Moderator',
  Admin: 'Admin',
};

/** The roles an admin hands out, from the one that does least to the one that does most. */
export const STAFF_ROLES: readonly RoleName[] = ['Viewer', 'Moderator', 'Admin'];

const ROLE_GRANTS: Record<RoleName, string> = {
  User: 'keeps their Naucto account and loses access to this console',
  Viewer: 'signs in to this console and reads every screen, without changing anything',
  Moderator:
    'signs in to this console and works the moderation screens: reviews reports, hides and restores content, warns and suspends accounts',
  Admin:
    'signs in to this console, reads and changes everything, deletes for good and hands out roles',
};

/** What holding a role comes to, as the clause that follows the name of the account. */
export function roleGrant(role: RoleName): string {
  return ROLE_GRANTS[role];
}

export function roleLabel(role: RoleName | null): string {
  return role ? ROLE_LABELS[role] : '';
}
