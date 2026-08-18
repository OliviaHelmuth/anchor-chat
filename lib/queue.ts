import type { Prisma } from "@prisma/client";
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
  // FR-11.1 — included even though today's dashboard only ever queries its
  // own claimed sessions (so this is always "you"): getArchivedSessions
  // below reuses the same shape across every Listener, where it isn't.
  listenerDisplayName: string | null;
  // FR-11.2/11.3 — any-sender vs. visitor-specifically, because "last
  // activity" (used for archiving, FR-11.6) and "since the visitor last
  // replied" (FR-11.3) are different questions once a Listener has answered
  // and is just waiting on a reply.
  lastMessageAt: Date | null;
  lastVisitorMessageAt: Date | null;
  // FR-11.5's "time you last answered" filter.
  lastListenerMessageAt: Date | null;
  // FR-11.4's fallback when the visitor isn't currently Ably-present.
  visitorLastSeenAt: Date | null;
};

// FR-11.6 — no activity (message or claim) for this long drops a chat out
// of the active list into the read-only archive. 40 days, not a shorter
// "inactive" window: this is meant to catch genuinely abandoned chats, not
// ones just waiting on a reply overnight (FR-11.3 already surfaces that).
const ARCHIVE_THRESHOLD_MS = 40 * 24 * 60 * 60 * 1000;

function latestOf(...dates: (Date | null)[]): Date | null {
  const present = dates.filter((d): d is Date => d !== null);
  if (present.length === 0) return null;
  return new Date(Math.max(...present.map((d) => d.getTime())));
}

function isArchived(session: Pick<OngoingSession, "claimedAt" | "lastMessageAt">): boolean {
  const activityAt = latestOf(session.claimedAt, session.lastMessageAt);
  if (!activityAt) return false;
  return Date.now() - activityAt.getTime() > ARCHIVE_THRESHOLD_MS;
}

/**
 * Shared by getOngoingSessionsForListener and getArchivedSessions — same
 * row shape, different `where` (scoped to one Listener vs. every claimed
 * chat) and different archive-threshold filter applied by the caller.
 * "Ongoing" is derived from QueueEntry still existing with status=CLAIMED
 * — there's no separate ended/resolved state in the schema, so a chat
 * drops out of this list the same way it always has: the visitor leaving
 * deletes the QueueEntry (lib/queue.ts's leaveQueue). Session.listenerId
 * itself is never cleared on leave, which is why this can't just query
 * Session directly — that would keep showing a chat as "ongoing" forever
 * after the visitor left.
 *
 * Per-session last-message-by-sender isn't expressible as a single Prisma
 * `select` (the same `messages` relation can't be included twice with
 * different filters/aliases), so this fetches every message for the
 * matched sessions in one query and reduces it in JS — fine at this
 * project's scale (dozens of concurrent users, not thousands, per
 * docs/PRD.md's non-goals), and avoids a raw-SQL escape hatch for what's
 * otherwise a Prisma-only codebase.
 */
async function loadClaimedSessions(where: Prisma.QueueEntryWhereInput): Promise<OngoingSession[]> {
  const entries = await prisma.queueEntry.findMany({
    where,
    orderBy: { claimedAt: "desc" },
    select: {
      sessionId: true,
      claimedAt: true,
      session: {
        select: {
          displayName: true,
          lastSeenAt: true,
          listener: { select: { displayName: true } },
        },
      },
    },
  });

  const sessionIds = entries.map((entry) => entry.sessionId);
  const messages = sessionIds.length
    ? await prisma.message.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { sequence: "desc" },
        select: { sessionId: true, sender: true, createdAt: true },
      })
    : [];

  const lastMessageAt = new Map<string, Date>();
  const lastVisitorMessageAt = new Map<string, Date>();
  const lastListenerMessageAt = new Map<string, Date>();
  // Descending order means the first row seen per sessionId (per map) is
  // already the latest — no sorting needed inside the reduce.
  for (const message of messages) {
    if (!lastMessageAt.has(message.sessionId)) lastMessageAt.set(message.sessionId, message.createdAt);
    const bySender = message.sender === "VISITOR" ? lastVisitorMessageAt : lastListenerMessageAt;
    if (!bySender.has(message.sessionId)) bySender.set(message.sessionId, message.createdAt);
  }

  return entries.map((entry) => ({
    sessionId: entry.sessionId,
    displayName: entry.session.displayName,
    claimedAt: entry.claimedAt,
    listenerDisplayName: entry.session.listener?.displayName ?? null,
    lastMessageAt: lastMessageAt.get(entry.sessionId) ?? null,
    lastVisitorMessageAt: lastVisitorMessageAt.get(entry.sessionId) ?? null,
    lastListenerMessageAt: lastListenerMessageAt.get(entry.sessionId) ?? null,
    visitorLastSeenAt: entry.session.lastSeenAt,
  }));
}

/** A Listener's currently-active (non-archived) claimed chats — the admin dashboard's claimed-chat list and multi-chat panels. */
export async function getOngoingSessionsForListener(listenerId: string): Promise<OngoingSession[]> {
  const sessions = await loadClaimedSessions({ status: "CLAIMED", session: { listenerId } });
  return sessions.filter((session) => !isArchived(session));
}

/** FR-11.6 — every claimed chat, across every Listener, that's aged past the archive threshold. Read-only, admin-only view (app/admin/archive). */
export async function getArchivedSessions(): Promise<OngoingSession[]> {
  const sessions = await loadClaimedSessions({ status: "CLAIMED" });
  return sessions.filter((session) => isArchived(session));
}
