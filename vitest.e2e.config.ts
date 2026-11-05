import { defineConfig } from "vitest/config";

// Real-browser layout and contrast checks (needs Google Chrome installed locally).
export default defineConfig({
  test: {
    include: ["e2e/**/*.e2e.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
