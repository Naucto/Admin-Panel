import React, { useEffect, useState } from "react";

export const nauctoPalette = {
  gray50: "#ececec",
  gray100: "#c3c3c3",
  gray200: "#a6a6a6",
  gray300: "#7e7e7e",
  gray400: "#656565",
  gray500: "#3e3e3e",
  gray600: "#383838",
  gray700: "#2c2c2c",
  gray800: "#222222",
  gray900: "#1a1a1a",
  yellow500: "#e5d351",
  blue500: "#537d8d",
  blue700: "#3b5964",
  red500: "#ac3931",
  green500: "#3d763d",
  background: "#303030",
  text: "#ffffff"
};

const THEME_STORAGE_KEY = "naucto-admin-theme";

function injectThemeStyles(): void {
  if (document.getElementById("naucto-admin-theme-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "naucto-admin-theme-styles";
  style.textContent = `
    :root {
      --naucto-bg: ${nauctoPalette.background};
      --naucto-surface: ${nauctoPalette.gray800};
      --naucto-surface-2: ${nauctoPalette.gray700};
      --naucto-border: ${nauctoPalette.gray500};
      --naucto-text: ${nauctoPalette.text};
      --naucto-muted: ${nauctoPalette.gray200};
      --naucto-primary: ${nauctoPalette.yellow500};
      --naucto-primary-soft: rgba(229, 211, 81, 0.22);
      --naucto-secondary: ${nauctoPalette.blue500};
      --naucto-secondary-soft: rgba(83, 125, 141, 0.28);
      --naucto-danger: ${nauctoPalette.red500};
      --naucto-danger-soft: rgba(172, 57, 49, 0.22);
      --naucto-success: ${nauctoPalette.green500};
      --naucto-success-soft: rgba(61, 118, 61, 0.24);
      --naucto-overlay: rgba(0, 0, 0, 0.28);
    }

    html[data-naucto-theme="light"] {
      --naucto-bg: ${nauctoPalette.gray50};
      --naucto-surface: #ffffff;
      --naucto-surface-2: #f7f7f7;
      --naucto-border: ${nauctoPalette.gray100};
      --naucto-text: ${nauctoPalette.gray900};
      --naucto-muted: ${nauctoPalette.gray500};
      --naucto-primary: ${nauctoPalette.blue500};
      --naucto-primary-soft: rgba(83, 125, 141, 0.16);
      --naucto-secondary: ${nauctoPalette.yellow500};
      --naucto-secondary-soft: rgba(229, 211, 81, 0.28);
      --naucto-danger: ${nauctoPalette.red500};
      --naucto-danger-soft: rgba(172, 57, 49, 0.12);
      --naucto-success: ${nauctoPalette.green500};
      --naucto-success-soft: rgba(61, 118, 61, 0.12);
      --naucto-overlay: rgba(26, 26, 26, 0.08);
    }

    body,
    #app,
    [data-css="app"],
    [data-css="app-content"],
    [data-css="styled-wrapper"] {
      background: var(--naucto-bg) !important;
      color: var(--naucto-text) !important;
      font-family: Pixelify, Roboto, Helvetica, Arial, sans-serif;
    }

    [data-css="topbar"],
    [data-css="sidebar"],
    [data-css="sidebar-footer"],
    [data-css="sidebar-branding"] {
      background: var(--naucto-surface) !important;
      color: var(--naucto-text) !important;
      border-color: var(--naucto-border) !important;
    }

    [data-css="sidebar"] nav,
    [data-css="sidebar"] ul,
    [data-css="sidebar"] li,
    [data-css="sidebar-resources"],
    [data-css="app-content"] > div:not([data-css="topbar"]):not([data-css="notice"]),
    [data-css$="-list-table-wrapper"],
    [data-css$="-new-form"],
    [data-css$="-edit-form"],
    [data-css$="-show-content"],
    [data-css$="-drawer-content"],
    [data-css$="-drawer-footer"] {
      background: var(--naucto-bg) !important;
      color: var(--naucto-text) !important;
      border-color: var(--naucto-border) !important;
    }

    [data-css$="-list-table-wrapper"],
    [data-css$="-show-content"],
    [data-css$="-new-form"],
    [data-css$="-edit-form"] {
      background: var(--naucto-surface) !important;
      border: 1px solid var(--naucto-border) !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 24px var(--naucto-overlay) !important;
    }

    [data-css="sidebar"] a,
    [data-css="topbar"] a,
    [data-css="sidebar"] span,
    [data-css="topbar"] span,
    [data-css="breadcrumbs"] a,
    [data-css="breadcrumbs"] span,
    [data-css="app-content"] p,
    [data-css="app-content"] label,
    [data-css="app-content"] h1,
    [data-css="app-content"] h2,
    [data-css="app-content"] h3,
    [data-css="app-content"] h4,
    [data-css="app-content"] h5,
    [data-css="app-content"] h6 {
      color: var(--naucto-text) !important;
    }

    [data-css="content"] {
      background: var(--naucto-bg) !important;
    }

    table,
    thead,
    tbody,
    tr,
    td,
    th {
      background: var(--naucto-surface) !important;
      color: var(--naucto-text) !important;
      border-color: var(--naucto-border) !important;
    }

    tr:hover td,
    [data-css="sidebar"] a:hover,
    [data-css="sidebar"] button:hover {
      background: var(--naucto-surface-2) !important;
    }

    input,
    select,
    textarea,
    [class*="control"] {
      background: var(--naucto-surface-2) !important;
      color: var(--naucto-text) !important;
      border-color: var(--naucto-border) !important;
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--naucto-muted) !important;
    }

    button {
      color: var(--naucto-text);
      border-color: var(--naucto-border) !important;
    }

    button[type="submit"],
    a[role="button"],
    [data-css$="-button"] button {
      border-color: var(--naucto-primary) !important;
    }

    a,
    button {
      border-radius: 8px;
    }

    .naucto-admin-page {
      color: var(--naucto-text);
      background: var(--naucto-bg);
      min-height: calc(100vh - 64px);
    }

    .naucto-card {
      background: var(--naucto-surface);
      border: 1px solid var(--naucto-border);
      border-radius: 8px;
      box-shadow: 0 10px 24px var(--naucto-overlay);
      color: var(--naucto-text);
    }

    .naucto-soft-card {
      background: var(--naucto-surface-2);
      border: 1px solid var(--naucto-border);
      border-radius: 8px;
      color: var(--naucto-text);
    }

    .naucto-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--naucto-primary) 20%, transparent);
      color: var(--naucto-text);
      border: 1px solid color-mix(in srgb, var(--naucto-primary) 55%, transparent);
      font-size: 12px;
    }

    .naucto-muted {
      color: var(--naucto-muted) !important;
    }

    .naucto-admin-resource-link {
      color: var(--naucto-primary) !important;
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 28px;
      padding: 2px 6px;
      border: 1px solid color-mix(in srgb, var(--naucto-primary) 36%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, var(--naucto-primary) 12%, transparent);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-decoration: none;
    }

    .naucto-admin-resource-link:hover {
      background: color-mix(in srgb, var(--naucto-primary) 20%, transparent);
      border-color: var(--naucto-primary);
      text-decoration: none;
    }

    .naucto-chart .recharts-cartesian-axis-tick-value,
    .naucto-chart .recharts-legend-item-text,
    .naucto-chart .recharts-label,
    .naucto-chart .recharts-text {
      fill: var(--naucto-muted) !important;
      color: var(--naucto-muted) !important;
    }

    .naucto-chart .recharts-cartesian-grid line {
      stroke: var(--naucto-border) !important;
    }

    .naucto-chart .recharts-tooltip-wrapper,
    .naucto-chart .recharts-default-tooltip {
      background: var(--naucto-surface) !important;
      border-color: var(--naucto-border) !important;
      color: var(--naucto-text) !important;
    }

    .naucto-chart .recharts-tooltip-label,
    .naucto-chart .recharts-tooltip-item {
      color: var(--naucto-text) !important;
    }
  `;

  document.head.appendChild(style);
}

export function applyStoredNauctoTheme(): "dark" | "light" {
  injectThemeStyles();
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  const theme = stored === "light" ? "light" : "dark";
  document.documentElement.dataset["nauctoTheme"] = theme;
  return theme;
}

export function setStoredNauctoTheme(theme: "dark" | "light"): void {
  injectThemeStyles();
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.dataset["nauctoTheme"] = theme;
}

export function useNauctoTheme(): ["dark" | "light", () => void] {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(applyStoredNauctoTheme());
  }, []);

  const toggleTheme = (): void => {
    const next = theme === "dark" ? "light" : "dark";
    setStoredNauctoTheme(next);
    setTheme(next);
  };

  return [theme, toggleTheme];
}

export const ThemeBoot: React.FC = () => {
  useNauctoTheme();
  return null;
};
