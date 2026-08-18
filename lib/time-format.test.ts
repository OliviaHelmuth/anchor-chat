import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDurationAgo } from "@/lib/time-format";

const labels = {
  justNow: "just now",
  oneMinuteAgo: "1 minute ago",
  minutesAgo: "{n} minutes ago",
  hoursAgo: "{n}h ago",
  daysAgo: "{n}d ago",
};

const NOW = new Date("2026-08-18T12:00:00.000Z");

describe("formatDurationAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns justNow for under 30 seconds (rounds to 0 minutes)", () => {
    const date = new Date(NOW.getTime() - 10_000);
    expect(formatDurationAgo(date, labels)).toBe("just now");
  });

  it("returns oneMinuteAgo for exactly one minute", () => {
    const date = new Date(NOW.getTime() - 60_000);
    expect(formatDurationAgo(date, labels)).toBe("1 minute ago");
  });

  it("returns minutesAgo for under an hour", () => {
    const date = new Date(NOW.getTime() - 45 * 60_000);
    expect(formatDurationAgo(date, labels)).toBe("45 minutes ago");
  });

  it("returns hoursAgo for under a day", () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 60_000);
    expect(formatDurationAgo(date, labels)).toBe("5h ago");
  });

  it("returns daysAgo for a day or more", () => {
    const date = new Date(NOW.getTime() - 3 * 24 * 60 * 60_000);
    expect(formatDurationAgo(date, labels)).toBe("3d ago");
  });

  it("accepts a string date, not just a Date object", () => {
    const iso = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString();
    expect(formatDurationAgo(iso, labels)).toBe("2h ago");
  });
});
