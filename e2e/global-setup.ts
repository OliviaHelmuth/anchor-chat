import { loadTestEnv } from "../integration/env";

// Runs once, in the same process workers fork from — mutating process.env
// here is Playwright's documented way to make .env.test's DATABASE_URL
// (etc.) visible before any spec file's `@/lib/prisma` import constructs
// its PrismaClient singleton.
export default function globalSetup() {
  loadTestEnv();
}
