import { Link as MuiLink } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { ModeratableType } from "@api/admin";

const ROUTE_BY_TYPE: Record<ModeratableType, string> = {
  USER: "/users",
  PROJECT: "/projects",
  COMMENT: "/comments"
};

type EntityLinkProps = {
  type: ModeratableType | "REPORT";
  id: number | null | undefined;
  /** What to show. Falls back to `TYPE #id`, or an em dash with no id. */
  label?: string | null;
};

/**
 * A link to another moderatable record inside the panel.
 *
 * Every moderation view refers to the others -- a report names its target, a
 * comment names its project and author -- so those references are rendered
 * through one component rather than printed as bare `#id` text.
 */
export function EntityLink({ type, id, label }: EntityLinkProps): JSX.Element {
  const text = label || (id != null ? `${type} #${id}` : "—");

  if (id == null) {
    return <>{text}</>;
  }

  const base = type === "REPORT" ? "/reports" : ROUTE_BY_TYPE[type];

  return (
    <MuiLink component={RouterLink} to={`${base}/${id}`} underline="hover">
      {text}
    </MuiLink>
  );
}
