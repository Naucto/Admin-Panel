import { Chip } from "@mui/material";
import type { AdminProject } from "@api/types";
import { resolvePublication } from "@utils/projectLinks";

type ProjectStatusChipProps = {
  project: Pick<AdminProject, "status" | "hidden">;
  /**
   * Also show the raw database status next to the publication state. Useful on
   * the detail page, where the distinction between "hidden" and "archived"
   * matters when deciding what to restore.
   */
  showRawStatus?: boolean;
};

export function ProjectStatusChip({
  project,
  showRawStatus = false
}: ProjectStatusChipProps): JSX.Element {
  const publication = resolvePublication(project);

  return (
    <>
      <Chip label={publication.label} color={publication.color} size="small" />
      {showRawStatus && project.status && (
        <Chip label={project.status} size="small" variant="outlined" />
      )}
    </>
  );
}
