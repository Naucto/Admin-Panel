import React from "react";
import { Box, Button, Icon, Text } from "@adminjs/design-system";
import { useSelector } from "react-redux";
import { useNauctoTheme } from "./theme-tools.js";

type TopBarProps = {
  toggleSidebar: () => void;
};

type AdminState = {
  paths: {
    logoutPath: string;
  };
  session?: {
    email?: string;
    title?: string;
    username?: string;
    role?: string;
  } | null;
};

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar }) => {
  const [theme, toggleTheme] = useNauctoTheme();
  const session = useSelector((state: AdminState) => state.session);
  const paths = useSelector((state: AdminState) => state.paths);

  return (
    <Box
      data-css="topbar"
      height="64px"
      px="lg"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      borderBottom="default"
      style={{
        background: "var(--naucto-surface)",
        color: "var(--naucto-text)"
      }}
    >
      <Box display="flex" alignItems="center" gridGap="lg">
        <Box
          onClick={toggleSidebar}
          display={["block", "block", "block", "block", "none"]}
          style={{ cursor: "pointer" }}
        >
          <Icon icon="Menu" size={24} />
        </Box>
        <Box>
          <Text fontWeight="bold">Naucto Admin</Text>
          <Text className="naucto-muted">Staff tools and app telemetry</Text>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gridGap="default">
        <Button size="sm" variant="outlined" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        {session?.email ? (
          <Box textAlign="right">
            <Text>{session.title ?? session.username ?? session.email}</Text>
            <Text className="naucto-muted">{session.role ?? session.email}</Text>
          </Box>
        ) : null}
        {session?.email ? (
          <Button as="a" href={paths.logoutPath} size="sm" variant="contained">
            Logout
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default TopBar;
