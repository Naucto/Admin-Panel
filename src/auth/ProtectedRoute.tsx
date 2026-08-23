import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthProvider";

type ProtectedRouteProps = {
  requireAdmin?: boolean;
};

export function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps): JSX.Element {
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

  if (requireAdmin && !user.roles.includes("Admin")) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
