import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { App } from "./App";
import { adminTheme } from "./theme";
import { AdminAuthProvider } from "@auth/AdminAuthProvider";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={4}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={4000}
      >
        <BrowserRouter>
          <AdminAuthProvider>
            <App />
          </AdminAuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  </StrictMode>
);
