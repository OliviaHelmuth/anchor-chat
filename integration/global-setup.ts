import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, openSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE_URL, PORT, REPO_ROOT, SERVER_LOG_PATH, SHARED_LISTENER_SESSION_PATH } from "./config";
import { loadTestEnv } from "./env";
import { pruneTestBuildTypesFromTsconfig } from "./prune-tsconfig";
import { newCookieJar, signInAsListener } from "./auth-helpers";

async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL);
      if (res.status < 500) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Test server at ${BASE_URL} did not become ready within ${timeoutMs}ms`);
}

// Builds and runs a second, production-mode server instance against the
// local test database — see next.config.ts's NEXT_TEST_BUILD comment for
// why this needs its own build output directory (a live `next dev` session
// may already be running against .next) and .env.test's AUTH_TRUST_HOST
// comment for why production mode (not `next dev`) is used here at all.
export default async function setup() {
  const testEnv = loadTestEnv();
  const env = { ...process.env, ...testEnv, NEXT_TEST_BUILD: "1" };

  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: REPO_ROOT,
    env,
    stdio: "inherit",
  });
  if (migrate.status !== 0) {
    throw new Error("prisma migrate deploy (test DB) failed — see output above.");
  }

  const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], { cwd: REPO_ROOT, env, stdio: "inherit" });
  if (seed.status !== 0) {
    throw new Error("db seed (test DB) failed — see output above.");
  }

  const build = spawnSync("npx", ["next", "build"], { cwd: REPO_ROOT, env, stdio: "inherit" });
  if (build.status !== 0) {
    throw new Error("next build (test build) failed — see output above.");
  }
  pruneTestBuildTypesFromTsconfig();

  mkdirSync(path.dirname(SERVER_LOG_PATH), { recursive: true });
  const logFd = openSync(SERVER_LOG_PATH, "w");

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", logFd, logFd],
  });

  await waitForServer(30_000);

  // One real sign-in for the whole run — see config.ts's
  // SHARED_LISTENER_SESSION_PATH comment for why.
  const jar = newCookieJar();
  await signInAsListener(jar, testEnv.LISTENER_ADMIN_EMAIL);
  writeFileSync(SHARED_LISTENER_SESSION_PATH, JSON.stringify(Object.fromEntries(jar)));

  return async () => {
    server.kill("SIGTERM");
  };
}
