import PlayIcon from "@mui/icons-material/PlayArrow";
import ScienceIcon from "@mui/icons-material/Science";
import { Button, IconButton, Tooltip } from "@mui/material";
import type { AdminProject } from "@api/types";
import { resolvePublication, toPlayUrl } from "@utils/projectLinks";

type PlayProjectButtonProps = {
  project: Pick<AdminProject, "id" | "status" | "hidden">;
  /** Render as a table-row icon instead of a full button. */
  compact?: boolean;
};

/**
 * Opens the game so staff can actually run it before deciding on a report.
 *
 * Published games open on the public page (what players see); everything else
 * opens the staff preview, which is why the label and icon differ.
 */
export function PlayProjectButton({
  project,
  compact = false
}: PlayProjectButtonProps): JSX.Element {
  const isPublic = resolvePublication(project).isPublic;
  const href = toPlayUrl(project);
  const label = isPublic ? "Play public page" : "Test unpublished build";
  const icon = isPublic ? <PlayIcon fontSize="small" /> : <ScienceIcon fontSize="small" />;

  if (compact) {
    return (
      <Tooltip title={label}>
        <IconButton
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {icon}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant="outlined"
      startIcon={icon}
    >
      {label}
    </Button>
  );
}
