import type {
  ListActionResponse,
  RecordActionResponse,
  RecordJSON
} from "adminjs";
import type { PrismaService } from "../prisma.service.js";

type LinkableResponse = ListActionResponse | RecordActionResponse;

type TargetLink = {
  label: string;
  recordId: number;
  resourceId: string;
};

type TargetInput = {
  id: number;
  type: string;
};

function recordsFromResponse(response: LinkableResponse): RecordJSON[] {
  if ("record" in response && response.record) {
    return [response.record];
  }

  if ("records" in response && response.records) {
    return response.records;
  }

  return [];
}

function numericParam(record: RecordJSON, paramName: string): number | null {
  const value = Number(record.params[paramName]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function targetKey(type: string, id: number): string {
  return `${type}:${id}`;
}

function truncate(value: string, maxLength = 82): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
}

export function adminResourceForTargetType(type: string): string | null {
  switch (type) {
    case "USER":
      return "User";
    case "PROJECT":
      return "Project";
    case "COMMENT":
      return "Comment";
    case "REPORT":
      return "Report";
    default:
      return null;
  }
}

export async function resolveTargetLinks(
  prisma: PrismaService,
  targets: TargetInput[]
): Promise<Map<string, TargetLink>> {
  const idsByType = new Map<string, Set<number>>();

  for (const target of targets) {
    const resourceId = adminResourceForTargetType(target.type);
    if (!resourceId) {
      continue;
    }

    const ids = idsByType.get(target.type) ?? new Set<number>();
    ids.add(target.id);
    idsByType.set(target.type, ids);
  }

  const [users, projects, comments, reports] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: Array.from(idsByType.get("USER") ?? []) } },
      select: { id: true, username: true, email: true }
    }),
    prisma.project.findMany({
      where: { id: { in: Array.from(idsByType.get("PROJECT") ?? []) } },
      select: { id: true, name: true, publishedName: true }
    }),
    prisma.comment.findMany({
      where: { id: { in: Array.from(idsByType.get("COMMENT") ?? []) } },
      select: {
        id: true,
        content: true,
        author: { select: { username: true } }
      }
    }),
    prisma.report.findMany({
      where: { id: { in: Array.from(idsByType.get("REPORT") ?? []) } },
      select: { id: true, reason: true, status: true }
    })
  ]);

  const links = new Map<string, TargetLink>();

  for (const user of users) {
    links.set(targetKey("USER", user.id), {
      label: user.username ? `@${user.username}` : user.email,
      recordId: user.id,
      resourceId: "User"
    });
  }

  for (const project of projects) {
    links.set(targetKey("PROJECT", project.id), {
      label: project.publishedName || project.name,
      recordId: project.id,
      resourceId: "Project"
    });
  }

  for (const comment of comments) {
    links.set(targetKey("COMMENT", comment.id), {
      label: `Comment #${comment.id} by @${comment.author.username}: ${truncate(comment.content)}`,
      recordId: comment.id,
      resourceId: "Comment"
    });
  }

  for (const report of reports) {
    links.set(targetKey("REPORT", report.id), {
      label: `Report #${report.id} · ${report.status} · ${truncate(report.reason, 48)}`,
      recordId: report.id,
      resourceId: "Report"
    });
  }

  return links;
}

async function enrichTargetLinks(
  prisma: PrismaService,
  response: LinkableResponse
): Promise<LinkableResponse> {
  const records = recordsFromResponse(response);
  const targets = records.flatMap((record) => {
    const id = numericParam(record, "targetId");
    const type = String(record.params["targetType"] ?? "");
    return id && type ? [{ id, type }] : [];
  });

  const links = await resolveTargetLinks(prisma, targets);

  for (const record of records) {
    const targetId = numericParam(record, "targetId");
    const targetType = String(record.params["targetType"] ?? "");
    const link = targetId ? links.get(targetKey(targetType, targetId)) : null;
    const fallbackResourceId = adminResourceForTargetType(targetType);

    record.params["targetResourceId"] = link?.resourceId ?? fallbackResourceId ?? "";
    record.params["targetRecordId"] = link?.recordId ?? targetId ?? "";
    record.params["targetLabel"] =
      link?.label ??
      (targetId && fallbackResourceId ? `${fallbackResourceId} #${targetId}` : "Unknown target");
  }

  return response;
}

export function enrichReportLinksAfter(prisma: PrismaService) {
  return (response: LinkableResponse): Promise<LinkableResponse> =>
    enrichTargetLinks(prisma, response);
}

export function enrichModerationActionLinksAfter(prisma: PrismaService) {
  return (response: LinkableResponse): Promise<LinkableResponse> =>
    enrichTargetLinks(prisma, response);
}
