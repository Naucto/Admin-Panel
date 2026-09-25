import {
  AppBar,
  Avatar,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from "@mui/material";
import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@auth/AdminAuthProvider";
import { SIDEBAR_WIDTH } from "./Sidebar";

function initials(user: { username: string; nickname: string | null }): string {
  const source = user.nickname || user.username;
  return source.slice(0, 2).toUpperCase();
}

export function TopBar(): JSX.Element {
  const { user, logout } = useAdminAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();

  const open = (event: MouseEvent<HTMLElement>): void => setAnchor(event.currentTarget);
  const close = (): void => setAnchor(null);

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { sm: `${SIDEBAR_WIDTH}px` }
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Moderation Console
        </Typography>
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {user.roles.map((role) => (
              <Chip key={role} size="small" label={role} color="primary" variant="outlined" />
            ))}
            <Typography variant="body2" color="text.secondary">
              {user.nickname || user.username}
            </Typography>
            <IconButton onClick={open} size="small">
              <Avatar sx={{ width: 32, height: 32 }}>{initials(user)}</Avatar>
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
              <MenuItem
                onClick={() => {
                  close();
                  void logout().then(() => navigate("/login"));
                }}
              >
                Sign out
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
