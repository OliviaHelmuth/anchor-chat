import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, E2E_SERVER_LOG_PATH } from "./integration/config";
import { loadTestEnv } from "./integration/env";

const testEnv = loadTestEnv();

// Builds and runs its own production-mode server (see next.config.ts's
// NEXT_TEST_BUILD comment) against the local test database, migrating and
// seeding first — same "real server, real Postgres, real Ably, no mocks"
// convention as this project's manual verification, just automated.
// BREVO_API_KEY/BREVO_SENDER_EMAIL stay unset (.env.test) so both magic-link
// flows log their sign-in URL to e2e-server.log instead of a real inbox.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // Only next start's own output is redirected to a file (for the
    // magic-link log-scraping helper) — next build clears out its distDir
    // before building, which would silently unlink an already-open log file
    // if the redirect wrapped the whole chain instead of just the server.
    command: [
      "npx prisma migrate deploy",
      "npx tsx prisma/seed.ts",
      "npx next build",
      "npx tsx integration/prune-tsconfig.ts",
      `npx next start -p ${E2E_PORT} > "${E2E_SERVER_LOG_PATH}" 2>&1`,
    ].join(" && "),
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...testEnv, NEXT_TEST_BUILD: "1" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
