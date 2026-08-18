import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Integration tests and the Playwright E2E test build/run a second server
  // instance (against .env.test's database) alongside whatever dev server
  // is already running locally — a shared .next would corrupt that live
  // dev session's build cache, so the test build gets its own directory.
  distDir: process.env.NEXT_TEST_BUILD ? ".next-test" : ".next",
};

export default nextConfig;
