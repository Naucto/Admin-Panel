import { Alert, Box, CircularProgress } from "@mui/material";
import type { ReactNode } from "react";

type AsyncBoundaryProps = {
  loading: boolean;
  error: string | null;
  children: ReactNode;
};

export function AsyncBoundary({ loading, error, children }: AsyncBoundaryProps): JSX.Element {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  return <>{children}</>;
}
