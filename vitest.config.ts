import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    // React plugin nodig voor JSX-transform in hooks-tests (renderHook)
    react(),
  ],
  test: {
    // jsdom simuleert window/localStorage/navigator — nodig voor hooks en session.ts
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    // Zelfde alias als tsconfig.json: @/ → project root
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
