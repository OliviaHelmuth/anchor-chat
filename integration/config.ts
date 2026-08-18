import path from "node:path";

// Separate port from the local dev server (3000) so both can run at once —
// see next.config.ts's NEXT_TEST_BUILD for why the build output is also
// kept separate (.next-test, not .next).
export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

export const REPO_ROOT = path.resolve(__dirname, "..");
export const SERVER_LOG_PATH = path.join(REPO_ROOT, ".next-test", "server.log");

// One real Listener sign-in per test run, persisted here for every test
// file to reuse — /api/auth/request-listener-login is rate-limited (5/min,
// lib/rate-limit.ts), and with dozens of integration test files each
// needing a Listener session, signing in fresh per test/file blows through
// that limit fast. Signing in once in global-setup and sharing the session
// cookie sidesteps it entirely, same as a real browser staying signed in
// across many requests.
export const SHARED_LISTENER_SESSION_PATH = path.join(
  REPO_ROOT,
  ".next-test",
  "listener-session.json",
);

// The Playwright E2E suite runs its own server instance on a third port —
// separate from both the local dev server (3000) and the Vitest
// integration harness (3100) so all three can coexist.
export const E2E_PORT = 3200;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_SERVER_LOG_PATH = path.join(REPO_ROOT, ".next-test", "e2e-server.log");
