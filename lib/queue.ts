import { prisma } from "./prisma";

// Fixed fallback per docs/challenges/queue-design.md's cold-start case: no
// claims yet (or none recently) means there's no real throughput signal to
// divide by, so guessing a number would be worse than naming the default.
const COLD_START_WAIT_SECONDS = 5 * 60;

const THROUGHPUT_WINDOW_MINUTES = 10;

/** 1-indexed rank among still-waiting entries, ordered by joinedAt. */
export async function getQueuePosition(sessionId: string): Promise<number | null> {
  const entry = await prisma.queueEntry.findUnique({ where: { sessionId } });
  if (!entry || entry.status !== "WAITING") return null;

  const aheadCount = await prisma.queueEntry.count({
    where: { status: "WAITING", joinedAt: { lt: entry.joinedAt } },
  });

  return aheadCount + 1;
}

/** Claims/minute over the trailing window — the real signal wait-time rides on. */
async function getRecentClaimThroughputPerMinute(): Promise<number> {
  const since = new Date(Date.now() - THROUGHPUT_WINDOW_MINUTES * 60 * 1000);
  const recentClaims = await prisma.queueEntry.count({
    where: { status: "CLAIMED", claimedAt: { gte: since } },
  });
  return recentClaims / THROUGHPUT_WINDOW_MINUTES;
}

/** Estimated seconds until this position would be claimed, given current throughput. */
export async function getWaitEstimateSeconds(position: number): Promise<number> {
  const depthAhead = position - 1;
  if (depthAhead <= 0) return 0;

  const throughputPerMinute = await getRecentClaimThroughputPerMinute();
  if (throughputPerMinute <= 0) return COLD_START_WAIT_SECONDS;

  const minutes = depthAhead / throughputPerMinute;
  return Math.round(minutes * 60);
}

// deleteMany, not delete: leaving is idempotent (double-click, already
// claimed, or already left) rather than throwing on a missing row (FR-3.4).
export async function leaveQueue(sessionId: string): Promise<void> {
  await prisma.queueEntry.deleteMany({ where: { sessionId } });
}

export type QueueEntrySummary = {
  id: string;
  position: number;
  joinedAt: Date;
};

/** Listener-facing live list (FR-4.2) — ordered the same way position is derived. */
export async function getWaitingQueueEntries(): Promise<QueueEntrySummary[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: "WAITING" },
    orderBy: { joinedAt: "asc" },
    select: { id: true, joinedAt: true },
  });

  return entries.map((entry, index) => ({
    id: entry.id,
    position: index + 1,
    joinedAt: entry.joinedAt,
  }));
}
