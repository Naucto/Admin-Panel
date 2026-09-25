import { Navigate } from "react-router-dom";
import { DashboardPage } from "@pages/DashboardPage";
import { usePermissions } from "./AdminAuthProvider";
import { PAGE_PERMISSIONS } from "./page-permissions";

export function HomeRoute(): JSX.Element {
  const can = usePermissions();
  if (can("VIEW_INSIGHTS")) return <DashboardPage />;
  const destination = Object.entries(PAGE_PERMISSIONS).find(([, permissions]) => permissions.some(can));
  return <Navigate to={destination ? `/${destination[0]}` : "/forbidden"} replace />;
}
