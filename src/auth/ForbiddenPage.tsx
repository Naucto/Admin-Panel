import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthProvider";

export function ForbiddenPage(): JSX.Element {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Stack spacing={2} alignItems="center" maxWidth={420} textAlign="center">
        <Typography variant="h4">Access denied</Typography>
        <Typography color="text.secondary">
          Your account does not have permission to view this page.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => navigate("/")}>Back to dashboard</Button>
          <Button variant="text" onClick={() => void logout().then(() => navigate("/login"))}>
            Sign out
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
