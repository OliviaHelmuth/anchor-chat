import { loadTestEnv } from "./env";

// Runs inside each Vitest worker (not global-setup's separate process) so
// that a test file importing @/lib/prisma for DB cleanup gets the same
// DATABASE_URL as the server it's talking to over HTTP.
loadTestEnv();
