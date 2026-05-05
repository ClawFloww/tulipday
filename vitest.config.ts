import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // jsdom simuleert window/localStorage — nodig voor session.ts en premium.ts
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    // Zelfde alias als tsconfig.json: @/ → project root
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
