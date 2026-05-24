import type {
  ActionContext,
  ActionRequest,
  ActionResponse,
  Before,
  ListActionResponse,
  RecordActionResponse,
  RecordJSON
} from "adminjs";
import bcrypt from "bcryptjs";
import {
  AccountStatus,
  ModerationActionType,
  ModerationTargetType,
  Prisma,
  ProjectStatus,
  ReportStatus
} from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import { CurrentAdmin, isAdmin } from "./current-admin.js";

type Handler = (
  request: ActionRequest,
  response: unknown,
  context: ActionContext
) => Promise<ActionResponse>;

function admin(context: ActionContext): CurrentAdmin | null {
  return (context.currentAdmin as CurrentAdmin | undefined) ?? null;
}

function recordId(context: ActionContext): number {
  return Number(context.record?.params["id"]);
}

function snapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function audit(
  prisma: PrismaService,
  actorId: number | null,
  targetType: ModerationTargetType,
  targetId: number,
  action: ModerationActionType,
  before: unknown,
  after: unknown,
  reason?: string | null,
  reportId?: number | null
): Promise<void> {
  await prisma.moderationAction.create({
    data: {
      actorId,
      targetType,
      targetId,
      action,
      reason: reason ?? null,
      before: snapshot(before),
      after: snapshot(after),
      reportId: reportId ?? null
    }
  });
}

export function hidePasswordsAfter(
  response: RecordActionResponse | ListActionResponse
): RecordActionResponse | ListActionResponse {
  if ("record" in response && response.record) {
    response.record.params["password"] = "";
  }
  if ("records" in response && response.records) {
    response.records.forEach((record: RecordJSON) => {
      record.params["password"] = "";
    });
  }
  return response;
}

export const hashPasswordBefore: Before = async (request) => {
  if (request.method !== "post") {
    return request;
  }

  if (request.payload?.["password"]) {
    request.payload["password"] = await bcrypt.hash(
      String(request.payload["password"]),
      10
    );
  } else if (request.payload) {
    delete request.payload["password"];
  }

  return request;
};

export function userStatusAction(
  prisma: PrismaService,
  status: AccountStatus
): Handler {
  return async (_request, _response, context) => {
    const currentAdmin = admin(context);
    const id = recordId(context);
    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        accountStatus: true,
        moderationReason: true,
        moderatedAt: true,
        moderatedById: true
      }
    });
    const after = await prisma.user.update({
      where: { id },
      data: {
        accountStatus: status,
        moderationReason: status === "ACTIVE" ? null : "Updated from AdminJS",
        moderatedAt: new Date(),
        moderatedById: currentAdmin?.databaseId ?? null
      }
    });

    await audit(
      prisma,
      currentAdmin?.databaseId ?? null,
      "USER",
      id,
      status === "BANNED"
        ? "BAN_USER"
        : status === "SUSPENDED"
          ? "SUSPEND_USER"
          : "RESTORE_USER",
      before,
      after,
      status === "ACTIVE" ? "Restored from AdminJS" : "Updated from AdminJS"
    );

    return {
      record: context.record?.toJSON(context.currentAdmin),
      notice: { message: `User marked ${status}.`, type: "success" }
    };
  };
}

export function projectModerationAction(
  prisma: PrismaService,
  hidden: boolean
): Handler {
  return async (_request, _response, context) => {
    const currentAdmin = admin(context);
    const id = recordId(context);
    const before = await prisma.project.findUnique({ where: { id } });
    const after = await prisma.project.update({
      where: { id },
      data: {
        hidden,
        hiddenReason: hidden ? "Updated from AdminJS" : null,
        hiddenAt: hidden ? new Date() : null,
        hiddenById: hidden ? currentAdmin?.databaseId ?? null : null,
        ...(hidden ? { status: ProjectStatus.ARCHIVED } : {})
      }
    });

    await audit(
      prisma,
      currentAdmin?.databaseId ?? null,
      "PROJECT",
      id,
      hidden ? "HIDE_PROJECT" : "RESTORE_PROJECT",
      before,
      after,
      hidden ? "Hidden from AdminJS" : "Restored from AdminJS"
    );

    return {
      record: context.record?.toJSON(context.currentAdmin),
      notice: {
        message: hidden ? "Project hidden." : "Project restored.",
        type: "success"
      }
    };
  };
}

export function unpublishProjectAction(prisma: PrismaService): Handler {
  return async (_request, _response, context) => {
    const currentAdmin = admin(context);
    const id = recordId(context);
    const before = await prisma.project.findUnique({ where: { id } });
    const after = await prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.IN_PROGRESS }
    });

    await audit(
      prisma,
      currentAdmin?.databaseId ?? null,
      "PROJECT",
      id,
      "UNPUBLISH_PROJECT",
      before,
      after,
      "Unpublished from AdminJS"
    );

    return {
      record: context.record?.toJSON(context.currentAdmin),
      notice: { message: "Project unpublished.", type: "success" }
    };
  };
}

export function commentModerationAction(
  prisma: PrismaService,
  hidden: boolean
): Handler {
  return async (_request, _response, context) => {
    const currentAdmin = admin(context);
    const id = recordId(context);
    const before = await prisma.comment.findUnique({ where: { id } });
    const after = await prisma.comment.update({
      where: { id },
      data: {
        hidden,
        hiddenReason: hidden ? "Updated from AdminJS" : null,
        hiddenAt: hidden ? new Date() : null,
        hiddenById: hidden ? currentAdmin?.databaseId ?? null : null
      }
    });

    await audit(
      prisma,
      currentAdmin?.databaseId ?? null,
      "COMMENT",
      id,
      hidden ? "HIDE_COMMENT" : "RESTORE_COMMENT",
      before,
      after,
      hidden ? "Hidden from AdminJS" : "Restored from AdminJS"
    );

    return {
      record: context.record?.toJSON(context.currentAdmin),
      notice: {
        message: hidden ? "Comment hidden." : "Comment restored.",
        type: "success"
      }
    };
  };
}

export function reportStatusAction(
  prisma: PrismaService,
  status: ReportStatus
): Handler {
  return async (_request, _response, context) => {
    const currentAdmin = admin(context);
    const id = recordId(context);
    const before = await prisma.report.findUnique({ where: { id } });
    const after = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolutionNote: status === "OPEN" ? null : "Updated from AdminJS",
        resolvedAt: status === "OPEN" || status === "IN_REVIEW" ? null : new Date(),
        resolvedById:
          status === "OPEN" || status === "IN_REVIEW"
            ? null
            : currentAdmin?.databaseId ?? null
      }
    });

    await audit(
      prisma,
      currentAdmin?.databaseId ?? null,
      "REPORT",
      id,
      status === "RESOLVED"
        ? "RESOLVE_REPORT"
        : status === "IN_REVIEW"
          ? "REVIEW_REPORT"
          : "DISMISS_REPORT",
      before,
      after,
      "Report updated from AdminJS",
      id
    );

    return {
      record: context.record?.toJSON(context.currentAdmin),
      notice: { message: `Report marked ${status}.`, type: "success" }
    };
  };
}

export const adminOnly = ({ currentAdmin }: ActionContext): boolean =>
  isAdmin(currentAdmin as CurrentAdmin | undefined);
