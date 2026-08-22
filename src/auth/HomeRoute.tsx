import { Navigate } from "react-router-dom";
import { DashboardPage } from "@pages/DashboardPage";
import { useIsAdmin } from "./AdminAuthProvider";

/**
 * Landing page after sign-in.
 *
 * The dashboard reads `/admin/insights/dashboard`, which is Admin-only, so a
 * moderator used to land on an Admin-only route and be bounced straight to
 * "Access denied" — they could log in but never reach the panel. Send them to
 * their actual work queue instead.
 */
export function HomeRoute(): JSX.Element {
  const isAdmin = useIsAdmin();

  return isAdmin ? <DashboardPage /> : <Navigate to="/reports" replace />;
}
