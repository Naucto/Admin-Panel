import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  PlayCircle as PlayIcon,
  Favorite as HeartIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  SportsEsports as GameIcon,
  Forum as CommentIcon,
  Flag as FlagIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Storage as StorageIcon
} from "@mui/icons-material";
import { NavLink } from "react-router-dom";
import { useIsAdmin } from "@auth/AdminAuthProvider";

export const SIDEBAR_WIDTH = 240;

type NavItem = {
  to: string;
  label: string;
  icon: JSX.Element;
  adminOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <BarChartIcon />, adminOnly: true },
  { to: "/live", label: "Live Activity", icon: <PlayIcon /> },
  { to: "/social", label: "Social Overview", icon: <HeartIcon /> },
  { to: "/access", label: "Access Management", icon: <SettingsIcon />, adminOnly: true }
];

const MODERATION_NAV: NavItem[] = [
  { to: "/users", label: "Users", icon: <PeopleIcon /> },
  { to: "/projects", label: "Projects", icon: <GameIcon /> },
  { to: "/comments", label: "Comments", icon: <CommentIcon /> },
  { to: "/reports", label: "Reports", icon: <FlagIcon /> },
  { to: "/moderation-log", label: "Moderation Log", icon: <TimelineIcon /> },
  { to: "/roles", label: "Roles", icon: <SecurityIcon />, adminOnly: true }
];

const LOOKUP_NAV: NavItem[] = [
  { to: "/lookup/likes", label: "Likes", icon: <StorageIcon /> },
  { to: "/lookup/friendships", label: "Friendships", icon: <StorageIcon /> },
  { to: "/lookup/subscriptions", label: "Subscriptions", icon: <StorageIcon /> },
  { to: "/lookup/game-sessions", label: "Game Sessions", icon: <StorageIcon /> },
  { to: "/lookup/work-sessions", label: "Work Sessions", icon: <StorageIcon /> },
  { to: "/lookup/analytics-events", label: "Analytics Events", icon: <StorageIcon />, adminOnly: true },
  { to: "/lookup/daily-rollups", label: "Daily Rollups", icon: <StorageIcon />, adminOnly: true }
];

export function Sidebar(): JSX.Element {
  const isAdmin = useIsAdmin();

  const renderItems = (items: NavItem[]): JSX.Element[] =>
    items
      .filter((item) => !item.adminOnly || isAdmin)
      .map((item) => (
        <ListItem key={item.to} disablePadding>
          <ListItemButton component={NavLink} to={item.to} end={item.to === "/"}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        </ListItem>
      ));

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box"
        }
      }}
    >
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" sx={{ color: "primary.main", fontWeight: 700 }}>
          Naucto Admin
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: "auto" }}>
        <List subheader={<Typography variant="overline" sx={{ pl: 2 }}>Overview</Typography>}>
          {renderItems(PRIMARY_NAV)}
        </List>
        <Divider />
        <List subheader={<Typography variant="overline" sx={{ pl: 2 }}>Moderation</Typography>}>
          {renderItems(MODERATION_NAV)}
        </List>
        <Divider />
        <List subheader={<Typography variant="overline" sx={{ pl: 2 }}>Lookup</Typography>}>
          {renderItems(LOOKUP_NAV)}
        </List>
      </Box>
    </Drawer>
  );
}
