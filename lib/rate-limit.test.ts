import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited } from "@/lib/rate-limit";

// The limiter keeps its hit-counts in module-level state (by design — see
// the file's own comment on why that's fine for this project's scale), so
// each test uses its own unique key rather than resetting the module
// between tests.
let keyCounter = 0;
function freshKey(): string {
  keyCounter += 1;
  return `test-key-${keyCounter}`;
}

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit within the window", () => {
    const key = freshKey();
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
  });

  it("rejects a request once the count exceeds the limit within the window", () => {
    const key = freshKey();
    isRateLimited(key, 3, 60_000);
    isRateLimited(key, 3, 60_000);
    isRateLimited(key, 3, 60_000);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("resets the count once the window has elapsed", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) isRateLimited(key, 3, 60_000);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);

    vi.advanceTimersByTime(60_001);

    expect(isRateLimited(key, 3, 60_000)).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = freshKey();
    const keyB = freshKey();
    for (let i = 0; i < 4; i++) isRateLimited(keyA, 3, 60_000);
    expect(isRateLimited(keyA, 3, 60_000)).toBe(true);
    expect(isRateLimited(keyB, 3, 60_000)).toBe(false);
  });
});
