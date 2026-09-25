import type { Permission } from "@api/types";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthProvider";

type ProtectedRouteProps = {
  permissions?: Permission[];
};

export function ProtectedRoute({ permissions = [] }: ProtectedRouteProps): JSX.Element {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permissions.length && !permissions.some((permission) => user.permissions.includes(permission))) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
