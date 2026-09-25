import { createTheme } from "@mui/material/styles";

export const adminTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e5d351", contrastText: "#1a1a1a" },
    secondary: { main: "#537d8d" },
    background: {
      default: "#303030",
      paper: "#222222"
    },
    text: {
      primary: "#ffffff",
      secondary: "#a6a6a6"
    },
    error: { main: "#ac3931" },
    warning: { main: "#e5d351" },
    success: { main: "#3d763d" },
    info: { main: "#537d8d" },
    divider: "#3e3e3e"
  },
  typography: {
    fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif"
  },
  shape: { borderRadius: 8 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: "#1a1a1a", backgroundImage: "none" }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: "#1a1a1a", borderRight: "1px solid #3e3e3e" }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" }
      }
    }
  }
});
