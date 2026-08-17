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

export type ChatState =
  | { kind: "none" }
  | { kind: "waiting"; sessionId: string; position: number; waitSeconds: number }
  // Milestone 4: once claimed, the widget/queue-position view has nothing
  // left to poll for — messaging (T4.1/T4.2) takes over from here.
  | { kind: "claimed"; sessionId: string };

/**
 * What the widget/Listener chat view should render for this session right
 * now. Carries sessionId on every non-"none" branch because the widget's
 * sessionId prop is frozen at the initial server render — it never sees the
 * session /api/chat/start just created client-side without a full reload.
 * This response is the only source the widget can trust for "which chat:{id}
 * do I subscribe to" once the visitor is actually in one.
 */
export async function getChatState(sessionId: string): Promise<ChatState> {
  const entry = await prisma.queueEntry.findUnique({ where: { sessionId } });
  if (!entry) return { kind: "none" };
  if (entry.status === "CLAIMED") return { kind: "claimed", sessionId };

  const position = await getQueuePosition(sessionId);
  const waitSeconds = position === null ? 0 : await getWaitEstimateSeconds(position);
  return { kind: "waiting", sessionId, position: position ?? 1, waitSeconds };
}

// deleteMany, not delete: leaving is idempotent (double-click, already
// claimed, or already left) rather than throwing on a missing row (FR-3.4).
export async function leaveQueue(sessionId: string): Promise<void> {
  await prisma.queueEntry.deleteMany({ where: { sessionId } });
}

export type QueueEntrySummary = {
  id: string;
  sessionId: string;
  position: number;
  joinedAt: Date;
  displayName: string | null;
};

/**
 * Listener-facing live list (FR-4.2) and the source for the visitor-facing
 * roster (FR-5.6, `/api/chat/roster`) — same ordering, same rows, different
 * fields picked by each consumer (the roster route strips both ids and
 * filters out the caller's own entry — "who else", not a mirror). displayName
 * is null (render "Anonymous") unless the visitor set one (T4.2.1).
 */
export async function getWaitingQueueEntries(): Promise<QueueEntrySummary[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: "WAITING" },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      sessionId: true,
      joinedAt: true,
      session: { select: { displayName: true } },
    },
  });

  return entries.map((entry, index) => ({
    id: entry.id,
    sessionId: entry.sessionId,
    position: index + 1,
    joinedAt: entry.joinedAt,
    displayName: entry.session.displayName,
  }));
}

export type OngoingSession = {
  sessionId: string;
  displayName: string | null;
  claimedAt: Date | null;
};

/**
 * A Listener's currently-active claimed chats, for the admin dashboard's
 * "ongoing sessions" list (multi-chat panels). "Ongoing" is derived from
 * QueueEntry still existing with status=CLAIMED — there's no separate
 * ended/resolved state in the schema, so a chat drops out of this list the
 * same way it always has: the visitor leaving deletes the QueueEntry
 * (lib/queue.ts's leaveQueue). Session.listenerId itself is never cleared
 * on leave, which is why this can't just query Session directly — that
 * would keep showing a chat as "ongoing" forever after the visitor left.
 */
export async function getOngoingSessionsForListener(listenerId: string): Promise<OngoingSession[]> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: "CLAIMED", session: { listenerId } },
    orderBy: { claimedAt: "desc" },
    select: { sessionId: true, claimedAt: true, session: { select: { displayName: true } } },
  });

  return entries.map((entry) => ({
    sessionId: entry.sessionId,
    displayName: entry.session.displayName,
    claimedAt: entry.claimedAt,
  }));
}
