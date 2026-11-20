import type { IconName } from '../ui/icon-paths';
import { type Area, canOpen } from './roles';
import type { RoleName } from './types';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface GroupSpec {
  label: string;
  /** The area a role must open to see the group. Null for what every signed-in role has. */
  area: Area | null;
  items: (NavItem & { area?: Area })[];
}

const GROUPS: GroupSpec[] = [
  {
    label: 'Stats',
    area: 'stats',
    items: [
      { path: '/overview', label: 'Overview', icon: 'dashboard' },
      { path: '/timeline', label: 'Timeline', icon: 'clock' },
      { path: '/posts', label: 'Posts', icon: 'flag' },
      { path: '/audience', label: 'Audience', icon: 'users' },
      { path: '/games', label: 'Games', icon: 'gamepad' },
      { path: '/creators', label: 'Creators', icon: 'paint-bucket' },
      { path: '/live', label: 'Live', icon: 'zap' },
      { path: '/explorer', label: 'Explorer', icon: 'chart' },
      { path: '/compare', label: 'Compare', icon: 'trending-up' },
    ],
  },
  {
    label: 'Support',
    area: 'support',
    items: [
      { path: '/feedback', label: 'Feedback', icon: 'mood-happy' },
      { path: '/bugs', label: 'Bug reports', icon: 'bug' },
      { path: '/crashes', label: 'Crashes', icon: 'alert' },
    ],
  },
  {
    label: 'Moderation',
    area: 'moderation',
    items: [
      { path: '/moderation/queue', label: 'Queue', icon: 'warning-box' },
      { path: '/moderation/users', label: 'Users', icon: 'group' },
      { path: '/moderation/games', label: 'All games', icon: 'grid' },
    ],
  },
  {
    label: 'Administration',
    area: null,
    items: [
      { path: '/admins', label: 'Admins', icon: 'shield', area: 'administration' },
      { path: '/account', label: 'Account', icon: 'user' },
    ],
  },
];

/** The sidebar of a role: the groups it opens, each with the entries it opens. */
export function navFor(role: RoleName | null): NavGroup[] {
  return GROUPS.filter((group) => group.area === null || canOpen(role, group.area))
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => item.area === undefined || canOpen(role, item.area))
        .map(({ path, label, icon }) => ({ path, label, icon })),
    }))
    .filter((group) => group.items.length > 0);
}

/** Where a role starts: the first entry of its sidebar. */
export function landingFor(role: RoleName | null): string {
  return navFor(role)[0]?.items[0]?.path ?? '/account';
}
