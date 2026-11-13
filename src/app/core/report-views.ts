import type {
  AdminReport,
  AdminReportDetail,
  BugContext,
  BugDetail,
  BugSummary,
  CrashDetail,
  CrashGroup,
  CrashStatus,
  FeedbackAccount,
  Rating,
  ReportStatus,
} from './types';

/** The crash pages speak of open crashes: anything the team has not closed. */
export function crashStatus(status: ReportStatus): CrashStatus {
  return status === 'RESOLVED' || status === 'IGNORED' ? status : 'OPEN';
}

/** A rating, bug report or crash always has an account and the fields of its kind. */
function account(report: AdminReport): FeedbackAccount {
  if (!report.account) {
    throw new Error(`Report ${report.id} came without its account`);
  }
  return report.account;
}

export function toRating(report: AdminReport): Rating {
  return {
    id: report.id,
    score: report.score ?? 0,
    reasons: report.reasons,
    liked: report.liked,
    improve: report.improve,
    role: report.role ?? 'PLAYER',
    origin: report.origin ?? 'MANUAL',
    createdAt: report.createdAt,
    account: account(report),
    release: report.release,
    bugReportIds: report.followUpIds,
  };
}

export function toBugSummary(report: AdminReport): BugSummary {
  return {
    id: report.id,
    title: report.title ?? '',
    category: report.category ?? 'OTHER',
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    account: account(report),
    release: report.release,
    hasScreenshot: report.hasScreenshot,
  };
}

export function toBugDetail(report: AdminReportDetail): BugDetail {
  const context: BugContext = {
    ...(report.context ?? {}),
    ...(report.appRelease ? { appRelease: report.appRelease } : {}),
  };
  return {
    ...toBugSummary(report),
    description: report.message ?? '',
    route: report.route ?? '',
    projectId: report.projectId,
    context,
    adminNote: report.adminNote,
    rating: report.rating,
    screenshot: report.screenshot,
  };
}

export function toCrashGroup(report: AdminReport): CrashGroup {
  return {
    id: report.id,
    source: report.source ?? 'WEB',
    name: report.title ?? 'Error',
    message: report.message ?? '',
    count: report.count,
    firstSeen: report.createdAt,
    lastSeen: report.lastSeen ?? report.createdAt,
    lastRelease: report.appRelease,
    status: crashStatus(report.status),
    regressedAt: report.regressedAt,
  };
}

export function toCrashDetail(report: AdminReportDetail): CrashDetail {
  return { ...toCrashGroup(report), lastStack: report.stack ?? '', events: report.occurrences };
}
