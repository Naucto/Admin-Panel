import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AdminJSOptions } from "adminjs";
import type { PrismaService } from "../prisma.service.js";
import { CurrentAdmin, isAdmin, isStaff } from "./current-admin.js";
import {
  adminOnly,
  commentModerationAction,
  hashPasswordBefore,
  hidePasswordsAfter,
  projectModerationAction,
  reportStatusAction,
  unpublishProjectAction,
  userStatusAction
} from "./actions.js";
import {
  adminResourceForTargetType,
  enrichModerationActionLinksAfter,
  enrichReportLinksAfter,
  resolveTargetLinks
} from "./link-enrichment.js";

type PrismaResourceFactory = (
  modelName: string,
  options?: Record<string, unknown>
) => Record<string, unknown>;

type PrismaDmmfField = {
  name: string;
  kind?: string;
  type?: string;
  isId?: boolean;
  isList?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
};

type PrismaDmmfModel = {
  name: string;
  fields: PrismaDmmfField[];
};

type DailyRollup = {
  date: Date;
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
};

type CountValue = number | bigint | null;

type TopGameRow = {
  projectId: number;
  name: string;
  value: CountValue;
  views?: CountValue;
  likes?: CountValue;
  comments?: CountValue;
};

type PageRequest = {
  method?: string;
  query?: Record<string, string | undefined>;
  payload?: Record<string, unknown>;
};

const ADMIN_ENUM_VALUES: Record<string, string[]> = {
  AccountStatus: ["ACTIVE", "SUSPENDED", "BANNED"],
  AnalyticsEventType: [
    "ACCOUNT_CREATED",
    "LOGIN",
    "PROJECT_CREATED",
    "PROJECT_PUBLISHED",
    "PROJECT_UNPUBLISHED",
    "COMMENT_CREATED",
    "COMMENT_REPLIED",
    "LIKE_CREATED",
    "LIKE_REMOVED",
    "GAME_VIEWED",
    "GAME_SESSION_STARTED",
    "GAME_SESSION_ENDED",
    "WORK_SESSION_STARTED",
    "WORK_SESSION_JOINED",
    "WORK_SESSION_LEFT"
  ],
  GameSessionVisibility: ["PUBLIC", "FRIENDS_ONLY", "PRIVATE"],
  ModerationActionType: [
    "SUSPEND_USER",
    "BAN_USER",
    "RESTORE_USER",
    "HIDE_PROJECT",
    "RESTORE_PROJECT",
    "UNPUBLISH_PROJECT",
    "HIDE_COMMENT",
    "RESTORE_COMMENT",
    "REVIEW_REPORT",
    "RESOLVE_REPORT",
    "DISMISS_REPORT",
    "ANONYMIZE_USER",
    "HARD_DELETE_USER",
    "CREATE_STAFF_USER",
    "UPDATE_ROLES"
  ],
  ModerationTargetType: ["USER", "PROJECT", "COMMENT", "REPORT"],
  MonetizationType: ["NONE", "ADS", "PAID"],
  ProjectStatus: ["IN_PROGRESS", "COMPLETED", "ARCHIVED"],
  ReportStatus: ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"],
  ReportTargetType: ["USER", "PROJECT", "COMMENT"]
};

const ADMIN_ENUMS = Object.entries(ADMIN_ENUM_VALUES).map(([name, values]) => ({
  name,
  values: values.map((value) => ({ name: value }))
}));

const ARRAY_FIELDS_BY_MODEL: Record<string, Set<string>> = {
  Project: new Set(["tags", "publishedTags"])
};

const OPTIONAL_FIELDS_BY_MODEL: Record<string, Set<string>> = {
  AnalyticsEvent: new Set(["userId", "projectId", "commentId", "metadata"]),
  Comment: new Set(["parentId", "hiddenReason", "hiddenAt", "hiddenById"]),
  DailyAnalyticsRollup: new Set([]),
  FriendRequest: new Set([]),
  Friendship: new Set([]),
  GameSession: new Set(["endedAt"]),
  Like: new Set([]),
  ModerationAction: new Set([
    "actorId",
    "reason",
    "before",
    "after",
    "reportId"
  ]),
  Project: new Set([
    "longDesc",
    "publishedName",
    "publishedShortDesc",
    "publishedLongDesc",
    "iconUrl",
    "price",
    "publishedAt",
    "contentKey",
    "contentExtension",
    "contentUploadedAt",
    "forkedFromId",
    "hiddenReason",
    "hiddenAt",
    "hiddenById"
  ]),
  RefreshToken: new Set([]),
  Report: new Set(["details", "resolutionNote", "resolvedAt", "resolvedById"]),
  Role: new Set([]),
  Subscription: new Set(["endDate"]),
  User: new Set(["nickname", "moderationReason", "moderatedAt", "moderatedById"]),
  WorkSession: new Set([])
};

const UNIQUE_FIELDS_BY_MODEL: Record<string, Set<string>> = {
  DailyAnalyticsRollup: new Set(["date"]),
  FriendRequest: new Set(["fromId", "toId"]),
  Friendship: new Set(["userAId", "userBId"]),
  GameSession: new Set(["sessionId"]),
  Like: new Set(["userId", "projectId"]),
  Project: new Set([]),
  Role: new Set(["name"]),
  User: new Set(["email", "username"]),
  WorkSession: new Set(["projectId", "roomId"])
};

const staffOnly = ({ currentAdmin }: { currentAdmin?: CurrentAdmin }): boolean =>
  isStaff(currentAdmin);

const ACTIVE_WORK_SESSION_WINDOW_MS = 15 * 60 * 1000;
const DASHBOARD_HISTORY_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const CREATED_AT_DESC = {
  sortBy: "createdAt",
  direction: "desc"
} as const;

function navigation(name: string, icon: string): { name: string; icon: string } {
  return { name, icon };
}

function numberValue(value: CountValue | undefined): number {
  return Number(value ?? 0);
}

function displayProjectName(project: {
  name: string;
  publishedName?: string | null;
}): string {
  return project.publishedName || project.name;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDailyHistory(rows: DailyRollup[], days: number): DailyRollup[] {
  const start = new Date(Date.now() - Math.max(days - 1, 0) * ONE_DAY_MS);
  start.setUTCHours(0, 0, 0, 0);

  const rowByDate = new Map(rows.map((row) => [formatDateKey(row.date), row]));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * ONE_DAY_MS);
    const key = formatDateKey(date);
    const row = rowByDate.get(key);

    return {
      date,
      accountsCreated: row?.accountsCreated ?? 0,
      logins: row?.logins ?? 0,
      projectsCreated: row?.projectsCreated ?? 0,
      projectsPublished: row?.projectsPublished ?? 0,
      projectsUnpublished: row?.projectsUnpublished ?? 0,
      commentsCreated: row?.commentsCreated ?? 0,
      likesCreated: row?.likesCreated ?? 0,
      likesRemoved: row?.likesRemoved ?? 0,
      gameViews: row?.gameViews ?? 0,
      gameSessionsStarted: row?.gameSessionsStarted ?? 0,
      gameSessionsEnded: row?.gameSessionsEnded ?? 0,
      workSessionsStarted: row?.workSessionsStarted ?? 0,
      workSessionsJoined: row?.workSessionsJoined ?? 0,
      workSessionsLeft: row?.workSessionsLeft ?? 0
    };
  });
}

function mapTopGameRows(rows: TopGameRow[]): Array<Record<string, number | string>> {
  return rows.map((row) => ({
    projectId: row.projectId,
    name: row.name,
    value: numberValue(row.value),
    views: numberValue(row.views),
    likes: numberValue(row.likes),
    comments: numberValue(row.comments)
  }));
}

function currentAdminOrNull(context: { currentAdmin?: unknown }): CurrentAdmin | null {
  return (context.currentAdmin as CurrentAdmin | undefined) ?? null;
}

function requireAdminPage(context: { currentAdmin?: unknown }): CurrentAdmin | null {
  const currentAdmin = currentAdminOrNull(context);
  return isAdmin(currentAdmin) ? currentAdmin : null;
}

async function buildLiveActivityData(prisma: PrismaService): Promise<Record<string, unknown>> {
  const activeWorkSessionCutoff = new Date(
    Date.now() - ACTIVE_WORK_SESSION_WINDOW_MS
  );
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const last7Days = new Date(Date.now() - 7 * ONE_DAY_MS);

  const [
    activeGames,
    activeWork,
    recentGames,
    gamesToday,
    games7Days,
    gamesAllTime,
    workToday,
    work7Days,
    workAllTime
  ] = await Promise.all([
    prisma.gameSession.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        hostId: true,
        startedAt: true,
        otherUsers: { select: { id: true } },
        project: {
          select: {
            id: true,
            name: true,
            publishedName: true,
            viewCount: true,
            likes: true
          }
        }
      }
    }),
    prisma.workSession.findMany({
      where: { lastActiveAt: { gte: activeWorkSessionCutoff } },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
      select: {
        id: true,
        hostId: true,
        startedAt: true,
        lastActiveAt: true,
        users: { select: { id: true } },
        project: {
          select: {
            id: true,
            name: true,
            publishedName: true
          }
        }
      }
    }),
    prisma.gameSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 12,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        otherUsers: { select: { id: true } },
        project: {
          select: {
            id: true,
            name: true,
            publishedName: true
          }
        }
      }
    }),
    prisma.gameSession.count({ where: { startedAt: { gte: today } } }),
    prisma.gameSession.count({ where: { startedAt: { gte: last7Days } } }),
    prisma.gameSession.count(),
    prisma.workSession.count({ where: { startedAt: { gte: today } } }),
    prisma.workSession.count({ where: { startedAt: { gte: last7Days } } }),
    prisma.workSession.count()
  ]);

  const playerIds = new Set<number>();
  for (const session of activeGames) {
    playerIds.add(session.hostId);
    session.otherUsers.forEach((user) => playerIds.add(user.id));
  }

  const creatorIds = new Set<number>();
  for (const session of activeWork) {
    creatorIds.add(session.hostId);
    session.users.forEach((user) => creatorIds.add(user.id));
  }

  return {
    pageType: "live",
    metrics: {
      activePlayers: playerIds.size,
      activeGameSessions: activeGames.length,
      activeCreators: creatorIds.size,
      activeWorkSessions: activeWork.length,
      gamesToday,
      games7Days,
      gamesAllTime,
      workToday,
      work7Days,
      workAllTime
    },
    activeGames: activeGames.map((session) => ({
      id: session.id,
      projectId: session.project.id,
      name: displayProjectName(session.project),
      players: 1 + session.otherUsers.length,
      views: session.project.viewCount,
      likes: session.project.likes,
      startedAt: session.startedAt.toISOString()
    })),
    activeWork: activeWork.map((session) => ({
      id: session.id,
      projectId: session.project.id,
      name: displayProjectName(session.project),
      creators: new Set([session.hostId, ...session.users.map((user) => user.id)]).size,
      startedAt: session.startedAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString()
    })),
    recentGames: recentGames.map((session) => ({
      id: session.id,
      projectId: session.project.id,
      name: displayProjectName(session.project),
      players: 1 + session.otherUsers.length,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null
    }))
  };
}

async function buildSocialOverviewData(prisma: PrismaService): Promise<Record<string, unknown>> {
  const now = new Date();
  const [
    likes,
    comments,
    visibleComments,
    deletedComments,
    hiddenComments,
    friendships,
    friendRequests,
    subscriptions,
    activeSubscriptions,
    topLikedGames,
    topCommentedGames
  ] = await Promise.all([
    prisma.like.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { deleted: false, hidden: false } }),
    prisma.comment.count({ where: { deleted: true } }),
    prisma.comment.count({ where: { hidden: true } }),
    prisma.friendship.count(),
    prisma.friendRequest.count(),
    prisma.subscription.count(),
    prisma.subscription.count({
      where: { OR: [{ endDate: null }, { endDate: { gt: now } }] }
    }),
    prisma.project.findMany({
      where: { hidden: false },
      orderBy: { likes: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        publishedName: true,
        likes: true,
        viewCount: true
      }
    }),
    prisma.$queryRaw<TopGameRow[]>`
      SELECT
        p.id AS "projectId",
        COALESCE(p."publishedName", p.name) AS name,
        COUNT(c.id)::int AS value,
        p."viewCount"::int AS views,
        p.likes::int AS likes
      FROM "Comment" c
      INNER JOIN "Project" p ON p.id = c."projectId"
      WHERE p.hidden = false
      GROUP BY p.id
      ORDER BY value DESC
      LIMIT 8
    `
  ]);

  return {
    pageType: "social",
    metrics: {
      likes,
      comments,
      visibleComments,
      deletedComments,
      hiddenComments,
      friendships,
      friendRequests,
      subscriptions,
      activeSubscriptions
    },
    commentBreakdown: [
      { name: "Visible", value: visibleComments },
      { name: "Deleted", value: deletedComments },
      { name: "Hidden", value: hiddenComments }
    ],
    topLikedGames: topLikedGames.map((project) => ({
      projectId: project.id,
      name: displayProjectName(project),
      value: project.likes,
      likes: project.likes,
      views: project.viewCount
    })),
    topCommentedGames: mapTopGameRows(topCommentedGames)
  };
}

async function buildAccessManagementData(
  prisma: PrismaService,
  request: PageRequest,
  currentAdmin: CurrentAdmin
): Promise<Record<string, unknown>> {
  const payload = request.payload ?? {};
  const query = String(payload["query"] ?? request.query?.["query"] ?? "").trim();
  let notice: { type: string; message: string } | null = null;

  if (request.method?.toLowerCase() === "post") {
    const action = String(payload["action"] ?? "");
    const userId = Number(payload["userId"]);
    const isRoleUpdate =
      action === "grantModerator" || action === "revokeModerator";

    if (isRoleUpdate && Number.isFinite(userId) && userId > 0) {
      const moderatorRole = await prisma.role.upsert({
        where: { name: "Moderator" },
        update: {},
        create: { name: "Moderator" }
      });

      const before = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true }
      });

      if (action === "grantModerator") {
        await prisma.user.update({
          where: { id: userId },
          data: { roles: { connect: { id: moderatorRole.id } } }
        });
        notice = { type: "success", message: "Moderator access added." };
      }

      if (action === "revokeModerator") {
        await prisma.user.update({
          where: { id: userId },
          data: { roles: { disconnect: { id: moderatorRole.id } } }
        });
        notice = { type: "success", message: "Moderator access removed." };
      }

      const after = await prisma.user.findUnique({
        where: { id: userId },
        include: { roles: true }
      });

      await prisma.moderationAction.create({
        data: {
          actorId: currentAdmin.databaseId,
          targetType: "USER",
          targetId: userId,
          action: "UPDATE_ROLES",
          reason: notice?.message ?? "Role update from AdminJS",
          before: before ? JSON.parse(JSON.stringify(before)) : null,
          after: after ? JSON.parse(JSON.stringify(after)) : null
        }
      });
    }
  }

  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { username: { contains: query, mode: "insensitive" as const } },
          { nickname: { contains: query, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [staff, candidates] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { some: { name: { in: ["Admin", "Moderator"] } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { roles: true }
    }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { roles: true }
    })
  ]);

  return {
    pageType: "access",
    query,
    notice,
    staff: staff.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      accountStatus: user.accountStatus,
      roles: user.roles.map((role) => role.name)
    })),
    candidates: candidates.map((user) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      accountStatus: user.accountStatus,
      roles: user.roles.map((role) => role.name)
    }))
  };
}

function normalizeModelForAdminJS(model: PrismaDmmfModel): PrismaDmmfModel {
  const arrayFields = ARRAY_FIELDS_BY_MODEL[model.name] ?? new Set<string>();
  const optionalFields = OPTIONAL_FIELDS_BY_MODEL[model.name] ?? new Set<string>();
  const uniqueFields = UNIQUE_FIELDS_BY_MODEL[model.name] ?? new Set<string>();

  return {
    ...model,
    fields: model.fields.map((field) => ({
      ...field,
      isId: field.isId ?? field.name === "id",
      isList: field.isList ?? arrayFields.has(field.name),
      isRequired:
        field.isRequired ??
        (field.kind === "object" ? false : !optionalFields.has(field.name)),
      isUnique:
        field.isUnique ?? (field.name === "id" || uniqueFields.has(field.name))
    }))
  };
}

export async function buildAdminOptions(
  prisma: PrismaService,
  rootPath: string
): Promise<AdminJSOptions> {
  const [{ default: AdminJS, ComponentLoader }, prismaAdapter] =
    await Promise.all([
      import("adminjs"),
      import("@adminjs/prisma")
    ]);

  const { Database, Resource, getModelByName } = prismaAdapter;
  AdminJS.registerAdapter({ Database, Resource });

  const componentLoader = new ComponentLoader();
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const Dashboard = componentLoader.add(
    "Dashboard",
    path.join(dirname, "components", "dashboard")
  );
  const OverviewPage = componentLoader.add(
    "OverviewPage",
    path.join(dirname, "components", "overview-page")
  );
  const AccessManagement = componentLoader.add(
    "AccessManagement",
    path.join(dirname, "components", "access-management")
  );
  const AdminResourceLink = componentLoader.add(
    "AdminResourceLink",
    path.join(dirname, "components", "admin-resource-link")
  );
  componentLoader.override(
    "TopBar",
    path.join(dirname, "components", "top-bar")
  );

  const resource: PrismaResourceFactory = (modelName, options = {}) => ({
    resource: {
      model: normalizeModelForAdminJS(
        getModelByName(modelName) as PrismaDmmfModel
      ),
      client: prisma,
      clientModule: {
        Prisma: {
          dmmf: {
            datamodel: {
              enums: ADMIN_ENUMS
            }
          }
        }
      }
    },
    options
  });

  return {
    rootPath,
    componentLoader,
    branding: {
      companyName: "Naucto Admin",
      withMadeWithLove: false,
      theme: {
        colors: {
          primary100: "#e5d351",
          primary80: "#f3ebaf",
          primary60: "#d0c04a",
          primary40: "#a3963a",
          primary20: "#605922",
          accent: "#537d8d",
          bg: "#303030",
          container: "#222222",
          sidebar: "#1a1a1a",
          filterBg: "#2c2c2c",
          border: "#3e3e3e",
          inputBorder: "#656565",
          separator: "#3e3e3e",
          highlight: "#383838",
          text: "#ffffff",
          grey100: "#ffffff",
          grey80: "#ececec",
          grey60: "#a6a6a6",
          grey40: "#7e7e7e",
          grey20: "#3e3e3e",
          error: "#ac3931",
          errorDark: "#7a2823",
          errorLight: "#481815",
          success: "#3d763d",
          successDark: "#2e582e",
          successLight: "#1b331b",
          warning: "#e5d351",
          warningDark: "#a3963a",
          warningLight: "#605922",
          info: "#537d8d",
          infoDark: "#3b5964",
          infoLight: "#23353b"
        },
        borders: {
          default: "1px solid #3e3e3e",
          input: "1px solid #656565",
          bg: "1px solid #3e3e3e"
        }
      }
    },
    locale: {
      language: "en",
      translations: {
        en: {
          labels: {
            pages: "Overview"
          },
          pages: {
            superAdmin: "Super Admin",
            liveActivity: "Live Activity",
            socialOverview: "Social Overview",
            accessManagement: "Access Management"
          },
          resources: {
            Project: {
              properties: {
                userId: "Creator",
                hiddenById: "Hidden by",
                forkedFromId: "Forked from"
              }
            },
            Comment: {
              properties: {
                authorId: "Author",
                projectId: "Game",
                parentId: "Parent comment",
                hiddenById: "Hidden by"
              }
            },
            Report: {
              properties: {
                targetId: "Target",
                reporterId: "Reporter",
                resolvedById: "Resolved by"
              }
            },
            ModerationAction: {
              properties: {
                targetId: "Target",
                actorId: "Actor",
                reportId: "Linked report"
              }
            }
          }
        }
      }
    },
    pages: {
      superAdmin: {
        icon: "BarChart",
        component: Dashboard
      },
      liveActivity: {
        icon: "Play",
        component: OverviewPage,
        handler: async (_request, _response, context) => {
          if (!isStaff(currentAdminOrNull(context))) {
            return { forbidden: true };
          }

          return buildLiveActivityData(prisma);
        }
      },
      socialOverview: {
        icon: "Heart",
        component: OverviewPage,
        handler: async (_request, _response, context) => {
          if (!isStaff(currentAdminOrNull(context))) {
            return { forbidden: true };
          }

          return buildSocialOverviewData(prisma);
        }
      },
      accessManagement: {
        icon: "Settings",
        component: AccessManagement,
        handler: async (request, _response, context) => {
          const currentAdmin = requireAdminPage(context);
          if (!currentAdmin) {
            return { forbidden: true };
          }

          return buildAccessManagementData(
            prisma,
            request as PageRequest,
            currentAdmin
          );
        }
      }
    },
    dashboard: {
      component: Dashboard,
      handler: async (_request, _response, context) => {
        const currentAdmin = context.currentAdmin as CurrentAdmin | undefined;
        if (!isAdmin(currentAdmin)) {
          return { forbidden: true };
        }

        const days = DASHBOARD_HISTORY_DAYS;
        const start = new Date(Date.now() - (days - 1) * ONE_DAY_MS);
        start.setUTCHours(0, 0, 0, 0);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const last7Days = new Date(Date.now() - 7 * ONE_DAY_MS);
        const last24Hours = new Date(Date.now() - ONE_DAY_MS);
        const activeWorkSessionCutoff = new Date(
          Date.now() - ACTIVE_WORK_SESSION_WINDOW_MS
        );

        const [
          activeGameSessions,
          activeWorkSessions,
          totalUsers,
          accountStatusCounts,
          projectStatusCounts,
          reportStatusCounts,
          moderationActionCounts,
          projectAggregate,
          publishedProjects,
          hiddenProjects,
          totalComments,
          deletedComments,
          hiddenComments,
          openReports,
          reportsLast7Days,
          moderationActionsLast7Days,
          likes,
          totalGameSessions,
          endedGameSessions,
          totalWorkSessions,
          eventsLast24Hours,
          daily,
          topGamesByViews,
          topGamesByLikes,
          topGamesByPlays,
          topGamesByComments,
          recentReports
        ] = await Promise.all([
          prisma.gameSession.findMany({
            where: { endedAt: null },
            select: {
              id: true,
              hostId: true,
              projectId: true,
              startedAt: true,
              otherUsers: { select: { id: true } },
              project: {
                select: {
                  id: true,
                  name: true,
                  publishedName: true,
                  viewCount: true,
                  likes: true
                }
              }
            }
          }),
          prisma.workSession.findMany({
            where: { lastActiveAt: { gte: activeWorkSessionCutoff } },
            select: {
              id: true,
              hostId: true,
              projectId: true,
              lastActiveAt: true,
              users: { select: { id: true } },
              project: {
                select: {
                  id: true,
                  name: true,
                  publishedName: true
                }
              }
            }
          }),
          prisma.user.count(),
          prisma.user.groupBy({
            by: ["accountStatus"],
            _count: { _all: true }
          }),
          prisma.project.groupBy({
            by: ["status"],
            _count: { _all: true }
          }),
          prisma.report.groupBy({
            by: ["status"],
            _count: { _all: true }
          }),
          prisma.moderationAction.groupBy({
            by: ["action"],
            where: { createdAt: { gte: start } },
            _count: { _all: true }
          }),
          prisma.project.aggregate({
            _count: { _all: true },
            _sum: { viewCount: true, likes: true }
          }),
          prisma.project.count({
            where: { status: "COMPLETED", hidden: false }
          }),
          prisma.project.count({ where: { hidden: true } }),
          prisma.comment.count(),
          prisma.comment.count({ where: { deleted: true } }),
          prisma.comment.count({ where: { hidden: true } }),
          prisma.report.count({
            where: { status: { in: ["OPEN", "IN_REVIEW"] } }
          }),
          prisma.report.count({ where: { createdAt: { gte: last7Days } } }),
          prisma.moderationAction.count({
            where: { createdAt: { gte: last7Days } }
          }),
          prisma.like.count(),
          prisma.gameSession.count(),
          prisma.gameSession.count({ where: { endedAt: { not: null } } }),
          prisma.workSession.count(),
          prisma.analyticsEvent.count({ where: { createdAt: { gte: last24Hours } } }),
          prisma.dailyAnalyticsRollup.findMany({
            where: { date: { gte: start } },
            orderBy: { date: "asc" }
          }),
          prisma.project.findMany({
            where: { hidden: false },
            orderBy: { viewCount: "desc" },
            take: 8,
            select: {
              id: true,
              name: true,
              publishedName: true,
              viewCount: true,
              likes: true
            }
          }),
          prisma.project.findMany({
            where: { hidden: false },
            orderBy: { likes: "desc" },
            take: 8,
            select: {
              id: true,
              name: true,
              publishedName: true,
              viewCount: true,
              likes: true
            }
          }),
          prisma.$queryRaw<TopGameRow[]>`
            SELECT
              p.id AS "projectId",
              COALESCE(p."publishedName", p.name) AS name,
              COUNT(gs.id)::int AS value,
              p."viewCount"::int AS views,
              p.likes::int AS likes
            FROM "GameSession" gs
            INNER JOIN "Project" p ON p.id = gs."projectId"
            WHERE p.hidden = false
            GROUP BY p.id
            ORDER BY value DESC, views DESC
            LIMIT 8
          `,
          prisma.$queryRaw<TopGameRow[]>`
            SELECT
              p.id AS "projectId",
              COALESCE(p."publishedName", p.name) AS name,
              COUNT(c.id)::int AS value,
              p."viewCount"::int AS views,
              p.likes::int AS likes
            FROM "Comment" c
            INNER JOIN "Project" p ON p.id = c."projectId"
            WHERE p.hidden = false AND c.hidden = false AND c.deleted = false
            GROUP BY p.id
            ORDER BY value DESC, views DESC
            LIMIT 8
          `,
          prisma.report.findMany({
            where: { status: { in: ["OPEN", "IN_REVIEW"] } },
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              targetType: true,
              targetId: true,
              status: true,
              reason: true,
              createdAt: true
            }
          })
        ]);

        const currentPlayerIds = new Set<number>();
        const activeGameByProject = new Map<
          number,
          {
            projectId: number;
            name: string;
            value: number;
            players: Set<number>;
            views: number;
            likes: number;
          }
        >();

        for (const session of activeGameSessions) {
          currentPlayerIds.add(session.hostId);
          const row =
            activeGameByProject.get(session.projectId) ??
            {
              projectId: session.projectId,
              name: displayProjectName(session.project),
              value: 0,
              players: new Set<number>(),
              views: session.project.viewCount,
              likes: session.project.likes
            };

          row.value += 1;
          row.players.add(session.hostId);
          for (const user of session.otherUsers) {
            currentPlayerIds.add(user.id);
            row.players.add(user.id);
          }
          activeGameByProject.set(session.projectId, row);
        }

        const currentCreatorIds = new Set<number>();
        const activeWorkByProject = new Map<
          number,
          {
            projectId: number;
            name: string;
            value: number;
            creators: Set<number>;
          }
        >();

        for (const session of activeWorkSessions) {
          currentCreatorIds.add(session.hostId);
          const row =
            activeWorkByProject.get(session.projectId) ??
            {
              projectId: session.projectId,
              name: displayProjectName(session.project),
              value: 0,
              creators: new Set<number>()
            };

          row.value += 1;
          row.creators.add(session.hostId);
          for (const user of session.users) {
            currentCreatorIds.add(user.id);
            row.creators.add(user.id);
          }
          activeWorkByProject.set(session.projectId, row);
        }

        const accountBreakdown = accountStatusCounts.map((row) => ({
          name: row.accountStatus,
          value: row._count._all
        }));
        const projectBreakdown = projectStatusCounts.map((row) => ({
          name: row.status ?? "UNKNOWN",
          value: row._count._all
        }));
        const reportBreakdown = reportStatusCounts.map((row) => ({
          name: row.status,
          value: row._count._all
        }));
        const moderationActionBreakdown = moderationActionCounts
          .map((row) => ({
            name: row.action,
            value: row._count._all
          }))
          .sort((left, right) => right.value - left.value);
        const dailyHistory = buildDailyHistory(daily, days);
        const activeGames = Array.from(activeGameByProject.values())
          .map((row) => ({
            projectId: row.projectId,
            name: row.name,
            value: row.value,
            players: row.players.size,
            views: row.views,
            likes: row.likes
          }))
          .sort((left, right) => right.players - left.players)
          .slice(0, 8);
        const activeCreationProjects = Array.from(activeWorkByProject.values())
          .map((row) => ({
            projectId: row.projectId,
            name: row.name,
            value: row.value,
            creators: row.creators.size
          }))
          .sort((left, right) => right.creators - left.creators)
          .slice(0, 8);
        const recentReportLinks = await resolveTargetLinks(
          prisma,
          recentReports.map((report) => ({
            id: report.targetId,
            type: report.targetType
          }))
        );

        return {
          current: {
            players: currentPlayerIds.size,
            creators: currentCreatorIds.size,
            activeGameSessions: activeGameSessions.length,
            activeWorkSessions: activeWorkSessions.length
          },
          currentPlayers: currentPlayerIds.size,
          currentCreators: currentCreatorIds.size,
          totals: {
            users: totalUsers,
            activeUsers:
              accountBreakdown.find((row) => row.name === "ACTIVE")?.value ?? 0,
            suspendedUsers:
              accountBreakdown.find((row) => row.name === "SUSPENDED")?.value ??
              0,
            bannedUsers:
              accountBreakdown.find((row) => row.name === "BANNED")?.value ?? 0,
            totalProjects: projectAggregate._count._all,
            publishedProjects,
            hiddenProjects,
            totalViews: projectAggregate._sum.viewCount ?? 0,
            totalProjectLikes: projectAggregate._sum.likes ?? 0,
            comments: totalComments,
            deletedComments,
            hiddenComments,
            openReports,
            reportsLast7Days,
            moderationActionsLast7Days,
            likes,
            totalGameSessions,
            endedGameSessions,
            totalWorkSessions,
            eventsLast24Hours
          },
          breakdowns: {
            accounts: accountBreakdown,
            projects: projectBreakdown,
            reports: reportBreakdown,
            moderationActions: moderationActionBreakdown
          },
          top: {
            activeGames,
            activeCreationProjects,
            byViews: topGamesByViews.map((project) => ({
              projectId: project.id,
              name: displayProjectName(project),
              value: project.viewCount,
              views: project.viewCount,
              likes: project.likes
            })),
            byLikes: topGamesByLikes.map((project) => ({
              projectId: project.id,
              name: displayProjectName(project),
              value: project.likes,
              views: project.viewCount,
              likes: project.likes
            })),
            byPlays: mapTopGameRows(topGamesByPlays),
            byComments: mapTopGameRows(topGamesByComments)
          },
          recentReports: recentReports.map((report) => ({
            ...report,
            targetLabel:
              recentReportLinks.get(`${report.targetType}:${report.targetId}`)?.label ??
              `${report.targetType} #${report.targetId}`,
            targetRecordId:
              recentReportLinks.get(`${report.targetType}:${report.targetId}`)
                ?.recordId ?? report.targetId,
            targetResourceId:
              recentReportLinks.get(`${report.targetType}:${report.targetId}`)
                ?.resourceId ?? adminResourceForTargetType(report.targetType),
            createdAt: report.createdAt.toISOString()
          })),
          daily: dailyHistory.map((row) => ({
            date: row.date.toISOString().slice(0, 10),
            accountsCreated: row.accountsCreated,
            logins: row.logins,
            projectsCreated: row.projectsCreated,
            projectsPublished: row.projectsPublished,
            projectsUnpublished: row.projectsUnpublished,
            commentsCreated: row.commentsCreated,
            likesCreated: row.likesCreated,
            likesRemoved: row.likesRemoved,
            gameViews: row.gameViews,
            gameSessionsStarted: row.gameSessionsStarted,
            gameSessionsEnded: row.gameSessionsEnded,
            workSessionsStarted: row.workSessionsStarted,
            workSessionsJoined: row.workSessionsJoined,
            workSessionsLeft: row.workSessionsLeft
          }))
        };
      }
    },
    resources: [
      resource("User", {
        navigation: navigation("Moderation", "User"),
        titleProperty: "username",
        sort: CREATED_AT_DESC,
        listProperties: [
          "id",
          "email",
          "username",
          "nickname",
          "accountStatus",
          "createdAt"
        ],
        filterProperties: ["email", "username", "nickname", "accountStatus"],
        properties: {
          password: {
            isVisible: { list: false, filter: false, show: false, edit: true }
          },
          moderatedById: { reference: "User" },
          moderationReason: { type: "textarea" }
        },
        actions: {
          list: { isAccessible: staffOnly, after: hidePasswordsAfter },
          show: { isAccessible: staffOnly, after: hidePasswordsAfter },
          new: {
            isAccessible: adminOnly,
            before: [hashPasswordBefore],
            after: hidePasswordsAfter
          },
          edit: {
            isAccessible: adminOnly,
            before: [hashPasswordBefore],
            after: hidePasswordsAfter
          },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false },
          suspend: {
            actionType: "record",
            icon: "Pause",
            guard: "Suspend this user?",
            isAccessible: staffOnly,
            component: false,
            handler: userStatusAction(prisma, "SUSPENDED")
          },
          ban: {
            actionType: "record",
            icon: "Close",
            guard: "Ban this user?",
            isAccessible: staffOnly,
            component: false,
            handler: userStatusAction(prisma, "BANNED")
          },
          restore: {
            actionType: "record",
            icon: "Check",
            guard: "Restore this user?",
            isAccessible: staffOnly,
            component: false,
            handler: userStatusAction(prisma, "ACTIVE")
          }
        }
      }),
      resource("Role", {
        navigation: false,
        titleProperty: "name",
        actions: {
          list: { isAccessible: adminOnly },
          show: { isAccessible: adminOnly },
          new: { isAccessible: adminOnly },
          edit: { isAccessible: adminOnly },
          delete: { isAccessible: adminOnly },
          bulkDelete: { isAccessible: adminOnly }
        }
      }),
      resource("Project", {
        navigation: navigation("Moderation", "GameController"),
        titleProperty: "name",
        sort: { sortBy: "updatedAt", direction: "desc" },
        listProperties: [
          "id",
          "name",
          "status",
          "hidden",
          "likes",
          "viewCount",
          "createdAt",
          "updatedAt",
          "publishedAt",
          "userId"
        ],
        filterProperties: ["name", "status", "hidden", "userId", "createdAt"],
        properties: {
          userId: { reference: "User" },
          forkedFromId: { reference: "Project" },
          hiddenById: { reference: "User" },
          longDesc: { type: "textarea" },
          publishedLongDesc: { type: "textarea" },
          hiddenReason: { type: "textarea" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: staffOnly },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false },
          hide: {
            actionType: "record",
            icon: "Hide",
            guard: "Hide this project from public surfaces?",
            isAccessible: staffOnly,
            component: false,
            handler: projectModerationAction(prisma, true)
          },
          restore: {
            actionType: "record",
            icon: "View",
            guard: "Restore this project?",
            isAccessible: staffOnly,
            component: false,
            handler: projectModerationAction(prisma, false)
          },
          unpublish: {
            actionType: "record",
            icon: "Archive",
            guard: "Unpublish this project?",
            isAccessible: staffOnly,
            component: false,
            handler: unpublishProjectAction(prisma)
          }
        }
      }),
      resource("Comment", {
        navigation: navigation("Moderation", "MessageSquare"),
        titleProperty: "content",
        sort: CREATED_AT_DESC,
        listProperties: [
          "id",
          "projectId",
          "authorId",
          "content",
          "deleted",
          "hidden",
          "createdAt"
        ],
        filterProperties: [
          "projectId",
          "authorId",
          "deleted",
          "hidden",
          "createdAt"
        ],
        properties: {
          projectId: { reference: "Project" },
          authorId: { reference: "User" },
          parentId: { reference: "Comment" },
          hiddenById: { reference: "User" },
          content: { type: "textarea" },
          hiddenReason: { type: "textarea" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: staffOnly },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false },
          hide: {
            actionType: "record",
            icon: "Hide",
            guard: "Hide this comment?",
            isAccessible: staffOnly,
            component: false,
            handler: commentModerationAction(prisma, true)
          },
          restore: {
            actionType: "record",
            icon: "View",
            guard: "Restore this comment?",
            isAccessible: staffOnly,
            component: false,
            handler: commentModerationAction(prisma, false)
          }
        }
      }),
      resource("Report", {
        navigation: navigation("Moderation", "Flag"),
        titleProperty: "id",
        sort: CREATED_AT_DESC,
        listProperties: [
          "id",
          "targetType",
          "targetId",
          "status",
          "reason",
          "reporterId",
          "createdAt"
        ],
        filterProperties: ["targetType", "targetId", "status", "reporterId"],
        properties: {
          targetId: {
            components: {
              list: AdminResourceLink,
              show: AdminResourceLink
            },
            custom: {
              labelParam: "targetLabel",
              recordIdParam: "targetRecordId",
              resourceParam: "targetResourceId"
            }
          },
          reporterId: { reference: "User" },
          resolvedById: { reference: "User" },
          details: { type: "textarea" },
          resolutionNote: { type: "textarea" }
        },
        actions: {
          list: { isAccessible: staffOnly, after: enrichReportLinksAfter(prisma) },
          show: { isAccessible: staffOnly, after: enrichReportLinksAfter(prisma) },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: staffOnly },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false },
          inReview: {
            actionType: "record",
            icon: "Search",
            isAccessible: staffOnly,
            component: false,
            handler: reportStatusAction(prisma, "IN_REVIEW")
          },
          resolve: {
            actionType: "record",
            icon: "Check",
            isAccessible: staffOnly,
            component: false,
            handler: reportStatusAction(prisma, "RESOLVED")
          },
          dismiss: {
            actionType: "record",
            icon: "Close",
            isAccessible: staffOnly,
            component: false,
            handler: reportStatusAction(prisma, "DISMISSED")
          }
        }
      }),
      resource("ModerationAction", {
        navigation: navigation("Moderation", "Activity"),
        titleProperty: "id",
        sort: CREATED_AT_DESC,
        listProperties: [
          "id",
          "action",
          "targetType",
          "targetId",
          "actorId",
          "reportId",
          "createdAt"
        ],
        filterProperties: ["action", "targetType", "targetId", "actorId", "createdAt"],
        properties: {
          targetId: {
            components: {
              list: AdminResourceLink,
              show: AdminResourceLink
            },
            custom: {
              labelParam: "targetLabel",
              recordIdParam: "targetRecordId",
              resourceParam: "targetResourceId"
            }
          },
          actorId: { reference: "User" },
          reportId: {
            components: {
              list: AdminResourceLink,
              show: AdminResourceLink
            },
            custom: {
              resourceId: "Report",
              labelPrefix: "Report #"
            }
          }
        },
        actions: {
          list: { isAccessible: staffOnly, after: enrichModerationActionLinksAfter(prisma) },
          show: { isAccessible: staffOnly, after: enrichModerationActionLinksAfter(prisma) },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("Like", {
        navigation: false,
        properties: {
          userId: { reference: "User" },
          projectId: { reference: "Project" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("Friendship", {
        navigation: false,
        properties: {
          userAId: { reference: "User" },
          userBId: { reference: "User" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("FriendRequest", {
        navigation: false,
        properties: {
          fromId: { reference: "User" },
          toId: { reference: "User" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("Subscription", {
        navigation: false,
        properties: {
          userId: { reference: "User" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: adminOnly },
          edit: { isAccessible: adminOnly },
          delete: { isAccessible: adminOnly },
          bulkDelete: { isAccessible: adminOnly }
        }
      }),
      resource("GameSession", {
        navigation: false,
        sort: { sortBy: "startedAt", direction: "desc" },
        properties: {
          hostId: { reference: "User" },
          projectId: { reference: "Project" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("WorkSession", {
        navigation: false,
        sort: { sortBy: "lastActiveAt", direction: "desc" },
        properties: {
          hostId: { reference: "User" },
          projectId: { reference: "Project" }
        },
        actions: {
          list: { isAccessible: staffOnly },
          show: { isAccessible: staffOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("AnalyticsEvent", {
        navigation: false,
        sort: { sortBy: "createdAt", direction: "desc" },
        properties: {
          userId: { reference: "User" },
          projectId: { reference: "Project" },
          commentId: { reference: "Comment" }
        },
        actions: {
          list: { isAccessible: adminOnly },
          show: { isAccessible: adminOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      }),
      resource("DailyAnalyticsRollup", {
        navigation: false,
        sort: { sortBy: "date", direction: "desc" },
        actions: {
          list: { isAccessible: adminOnly },
          show: { isAccessible: adminOnly },
          new: { isAccessible: false, isVisible: false },
          edit: { isAccessible: false, isVisible: false },
          delete: { isAccessible: false, isVisible: false },
          bulkDelete: { isAccessible: false, isVisible: false }
        }
      })
    ]
  };
}
