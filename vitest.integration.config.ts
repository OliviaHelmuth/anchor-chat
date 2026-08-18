import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Separate from vitest.config.ts on purpose: these tests need a real Next
// server (built + started against .env.test's database) rather than jsdom,
// and they're slow enough (server build + real Postgres round trips) that
// they shouldn't run on every `npm test`. See integration/global-setup.ts.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["node_modules/**", "e2e/**"],
    globalSetup: ["./integration/global-setup.ts"],
    setupFiles: ["./integration/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
