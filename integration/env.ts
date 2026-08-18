import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./config";

/**
 * Minimal .env parser (no dotenv dependency needed for one file, one format).
 * Loads .env.test into process.env for whichever process calls this —
 * both the server child process (via global-setup) and the Vitest worker
 * process running the test files themselves (via vitest.integration.config's
 * setupFiles) need the same DATABASE_URL to talk to the same test database.
 */
export function loadTestEnv(): Record<string, string> {
  const envPath = path.join(REPO_ROOT, ".env.test");
  if (!existsSync(envPath)) {
    throw new Error(
      ".env.test not found — integration tests need a local test database configured there.",
    );
  }

  const parsed: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    parsed[key] = value;
  }

  if (!parsed.DATABASE_URL?.includes("overshare_test")) {
    throw new Error(
      ".env.test's DATABASE_URL must point at the local overshare_test database — refusing to " +
        "run integration tests against anything that looks like the real dev/prod database.",
    );
  }

  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
  return parsed;
}
