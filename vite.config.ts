import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      projects: ["./tsconfig.app.json"]
    })
  ],
  server: {
    port: 3002,
    host: true
  },
  preview: {
    port: 3002,
    host: true
  }
});
