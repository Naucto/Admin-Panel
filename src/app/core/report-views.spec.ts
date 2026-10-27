import { describe, expect, it } from 'vitest';

import { crashStatus, toBugDetail, toCrashGroup, toRating } from './report-views';
import type { AdminReport, AdminReportDetail } from './types';

const account = {
  id: 9,
  username: 'kay',
  nickname: 'Kay',
  email: 'kay@example.com',
  role: 'User' as const,
  createdAt: '2026-09-01T00:00:00.000Z',
  profileUrl: 'https://naucto.net/u/kay',
  deleted: false,
};

const report: AdminReport = {
  id: 5,
  kind: 'RATING',
  status: 'NEW',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
  account,
  role: 'CREATOR',
  route: null,
  release: null,
  appRelease: null,
  title: null,
  message: null,
  score: 3,
  reasons: ['BUGS'],
  liked: null,
  improve: 'Loading',
  origin: 'PROMPT',
  followUpIds: [31],
  category: null,
  ratingId: null,
  hasScreenshot: false,
  source: null,
  count: 1,
  lastSeen: null,
  regressedAt: null,
};

const detail = (fields: Partial<AdminReportDetail>): AdminReportDetail => ({
  ...report,
  adminNote: null,
  projectId: null,
  context: null,
  rating: null,
  screenshot: null,
  stack: null,
  occurrences: [],
  ...fields,
});

describe('report views', () => {
  it('reads a rating with its role and the bug reports it led to', () => {
    expect(toRating(report)).toMatchObject({
      id: 5,
      score: 3,
      role: 'CREATOR',
      origin: 'PROMPT',
      bugReportIds: [31],
    });
  });

  it('reads a bug report, with the build of the app in its context', () => {
    const bug = toBugDetail(
      detail({
        kind: 'BUG',
        title: 'No music',
        message: 'The song never starts.',
        category: 'SOUND',
        appRelease: '0.1.0+8f78127',
        context: { viewport: '1280x720' },
      }),
    );

    expect(bug).toMatchObject({
      title: 'No music',
      description: 'The song never starts.',
      category: 'SOUND',
      context: { viewport: '1280x720', appRelease: '0.1.0+8f78127' },
    });
  });

  it('reads a crash, open while the team has not closed it', () => {
    const crash = toCrashGroup({
      ...report,
      kind: 'CRASH',
      account: null,
      status: 'TRIAGED',
      title: 'TypeError',
      message: 'x is undefined',
      source: 'ENGINE',
      count: 37,
      lastSeen: '2026-10-24T09:00:00.000Z',
    });

    expect(crash).toMatchObject({
      name: 'TypeError',
      source: 'ENGINE',
      count: 37,
      status: 'OPEN',
      firstSeen: '2026-10-20T10:00:00.000Z',
    });
    expect(crashStatus('RESOLVED')).toBe('RESOLVED');
    expect(crashStatus('NEW')).toBe('OPEN');
  });
});
