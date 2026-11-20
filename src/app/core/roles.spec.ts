import { describe, expect, it } from 'vitest';

import { landingFor, navFor } from './nav';
import { type Area, canAct, canOpen, isAdmin } from './roles';
import type { RoleName } from './types';

const AREAS: Area[] = ['stats', 'support', 'moderation', 'administration'];

const labels = (role: RoleName | null): string[] => navFor(role).map((group) => group.label);
const paths = (role: RoleName | null): string[] =>
  navFor(role).flatMap((group) => group.items.map((item) => item.path));

describe('what a role opens', () => {
  it.each<RoleName>(['Admin', 'Viewer'])('%s opens every area', (role) => {
    expect(AREAS.filter((area) => canOpen(role, area))).toEqual(AREAS);
  });

  it('a moderator opens moderation and nothing else', () => {
    expect(AREAS.filter((area) => canOpen('Moderator', area))).toEqual(['moderation']);
  });

  it.each<RoleName | null>(['User', null])('%s opens nothing', (role) => {
    expect(AREAS.filter((area) => canOpen(role, area))).toEqual([]);
  });
});

describe('what a role changes', () => {
  it('a viewer sees everything an admin does and changes none of it', () => {
    expect(paths('Viewer')).toEqual(paths('Admin'));
    expect(canAct('Viewer')).toBe(false);
  });

  it.each<[RoleName | null, boolean, boolean]>([
    ['Admin', true, true],
    ['Moderator', true, false],
    ['Viewer', false, false],
    ['User', false, false],
    [null, false, false],
  ])('%s acts: %s, as an admin: %s', (role, acts, admin) => {
    expect(canAct(role)).toBe(acts);
    expect(isAdmin(role)).toBe(admin);
  });
});

describe('the sidebar of a role', () => {
  it('gives an admin every group', () => {
    expect(labels('Admin')).toEqual(['Stats', 'Support', 'Administration']);
  });

  it('keeps the admins list from a moderator, who still reaches their own account', () => {
    expect(paths('Moderator')).toEqual(['/account']);
  });

  it('never lists a group with nothing in it', () => {
    for (const role of ['Admin', 'Moderator', 'Viewer', 'User', null] as const) {
      expect(navFor(role).every((group) => group.items.length > 0)).toBe(true);
    }
  });
});

describe('where a role starts', () => {
  it.each<[RoleName | null, string]>([
    ['Admin', '/overview'],
    ['Viewer', '/overview'],
    ['Moderator', '/account'],
    [null, '/account'],
  ])('%s starts on %s', (role, path) => {
    expect(landingFor(role)).toBe(path);
  });

  it('always starts a role on a page it opens', () => {
    for (const role of ['Admin', 'Moderator', 'Viewer'] as const) {
      expect(paths(role)).toContain(landingFor(role));
    }
  });
});
