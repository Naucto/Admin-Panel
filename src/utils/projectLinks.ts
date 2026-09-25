import type { AdminProject } from "@api/types";

const FRONTEND_URL =
  import.meta.env.VITE_FRONTEND_URL || "http://localhost:3001";

export type PublicationState = {
  /** Short label for the chip, in the words staff actually use. */
  label: string;
  color: "success" | "warning" | "error" | "default";
  /** True when players can reach the game on the public site right now. */
  isPublic: boolean;
};

/**
 * Turns the two independent database fields (`status` and `hidden`) into the one
 * answer staff care about: can a player reach this game right now?
 *
 * The raw `status` alone is misleading -- a `COMPLETED` project that a moderator
 * hid is not published from a player's point of view, and `COMPLETED` /
 * `IN_PROGRESS` are storage words, not publication words.
 */
export function resolvePublication(
  project: Pick<AdminProject, "status" | "hidden">
): PublicationState {
  // Hidden wins: whatever the status says, moderation has taken it off the site.
  if (project.hidden) {
    return { label: "Hidden", color: "error", isPublic: false };
  }

  switch (project.status) {
    case "COMPLETED":
      return { label: "Published", color: "success", isPublic: true };
    case "ARCHIVED":
      return { label: "Archived", color: "default", isPublic: false };
    default:
      return { label: "Unpublished", color: "warning", isPublic: false };
  }
}

/**
 * Where to open a game to test it.
 *
 * A published, visible game goes to the public page, so staff see exactly what
 * players see. Anything else goes to the staff preview route, which loads the
 * latest save through the role-guarded API and records no views or plays.
 */
export function toPlayUrl(
  project: Pick<AdminProject, "id" | "status" | "hidden">
): string {
  const path = resolvePublication(project).isPublic
    ? `/project/${project.id}/play`
    : `/project/${project.id}/preview`;

  return `${FRONTEND_URL}${path}`;
}
