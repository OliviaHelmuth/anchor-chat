"use client";

import * as Ably from "ably";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OngoingSession, QueueEntrySummary } from "@/lib/queue";
import { formatDurationAgo } from "@/lib/time-format";
import { useI18n } from "@/lib/i18n";
import { useUnreadTabNotifier } from "@/lib/useUnreadTabNotifier";
import { ListenerChat } from "./ListenerChat";

const POLL_INTERVAL_MS = 20_000;
const OPEN_SESSIONS_STORAGE_KEY = "anchor-chat:listener-open-sessions";

type SortBy = "lastOnline" | "lastAnswered";

function readStoredOpenSessions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OPEN_SESSIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

// FR-11.5 — ascending on purpose: the chat that's gone longest without the
// signal you're sorting by (visitor presence, or your own last reply)
// floats to the top, since that's the one most likely to need attention.
// A visitor currently online sorts as "now" under the lastOnline key, so
// they land at the bottom of that ordering — nothing to chase there.
function sortValue(session: OngoingSession, sortBy: SortBy, online: boolean): number {
  if (sortBy === "lastOnline") {
    if (online) return Date.now();
    const fallback = session.visitorLastSeenAt ?? session.lastVisitorMessageAt ?? session.claimedAt;
    return fallback ? new Date(fallback).getTime() : 0;
  }
  const answered = session.lastListenerMessageAt ?? session.claimedAt;
  return answered ? new Date(answered).getTime() : 0;
}

// The dashboard shell: queue (with multi-select claim), the Listener's own
// claimed-chat list (FR-11), and a row of simultaneously-open ListenerChat
// panels. Previously each claim navigated to its own page
// (/listener/chat/[id]) — a real Next.js navigation unmounts the whole
// previous page, which is why switching chats used to silently disconnect
// whichever one you'd been on. Panels here are just entries in
// openSessionIds, rendered side by side without ever navigating away, so
// nothing closes just because attention moved to a different chat.
export function AdminDashboard({
  initialQueue,
  initialOngoing,
  listenerDisplayName,
  isAdmin,
}: {
  initialQueue: QueueEntrySummary[];
  initialOngoing: OngoingSession[];
  listenerDisplayName: string | null;
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  // Falls back to a generic label rather than "You" — the request was for
  // each message to carry a real name, same as the visitor's, not a
  // self/other distinction. Can happen if an approved Listener hasn't set
  // their own profile displayName yet (T3.5.3 — it starts blank).
  const listenerName = listenerDisplayName?.trim() || t.admin.chat.defaultListenerName;
  // T4.7 — one notifier for the whole dashboard tab, not one per panel:
  // a new message in any open panel should flip the tab title/favicon and
  // (if opted in) fire a native notification, whether or not that panel
  // is the one currently scrolled into view.
  const { notifyNewMessage, notifyPermission, desktopEnabled, toggleDesktopNotifications } =
    useUnreadTabNotifier("overshare.io — Admin", t.admin.dashboard.notifyBody);
  const [queue, setQueue] = useState<QueueEntrySummary[]>(initialQueue);
  const [ongoing, setOngoing] = useState<OngoingSession[]>(initialOngoing);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openSessionIds, setOpenSessionIds] = useState<string[]>([]);
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("lastOnline");
  // FR-11.4 — sessionId -> is the visitor currently Ably-present. Only
  // carries entries for chats this connection has actually subscribed
  // presence for (see the effect below); missing means "not known yet,"
  // rendered the same as offline until the first presence.get() resolves.
  const [visitorOnline, setVisitorOnline] = useState<Record<string, boolean>>({});
  // In-app unread indicator, requested directly: a claimed chat whose
  // panel isn't open gets a dot in the "Laufende Chats" list the moment a
  // new visitor message lands on it, cleared the moment that panel opens.
  // Deliberately separate from useUnreadTabNotifier's tab-level title/
  // favicon badge (T4.7) — this is "which specific chat needs you," not
  // "something happened somewhere."
  const [unreadSessionIds, setUnreadSessionIds] = useState<Set<string>>(new Set());

  const fetchingQueueRef = useRef(false);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const presenceChannelsRef = useRef<Map<string, Ably.RealtimeChannel>>(new Map());
  // Read inside the message handler below, which is only re-created when
  // the set of *claimed* chats changes (see claimedIdsKey) — not when a
  // panel opens/closes — so it needs a ref to see the current
  // openSessionIds rather than closing over a stale array.
  const openSessionIdsRef = useRef<string[]>([]);

  async function refreshQueue() {
    if (fetchingQueueRef.current) return;
    fetchingQueueRef.current = true;
    try {
      const res = await fetch("/api/queue");
      if (res.ok) {
        const data = (await res.json()) as { entries: QueueEntrySummary[] };
        setQueue(data.entries);
      }
    } finally {
      fetchingQueueRef.current = false;
    }
  }

  async function refreshOngoing() {
    const res = await fetch("/api/listener/sessions");
    if (!res.ok) return;
    const data = (await res.json()) as { sessions: OngoingSession[] };
    setOngoing(data.sessions);
    // A panel whose chat dropped out of "ongoing" (the visitor left,
    // deleting the QueueEntry, or it aged into the archive — see
    // getOngoingSessionsForListener) has no one left to talk to; auto-close
    // it rather than leave a dead panel.
    setOpenSessionIds((prev) => prev.filter((id) => data.sessions.some((s) => s.sessionId === id)));
  }

  // Restore whichever panels were open on the last visit. Deliberately an
  // effect, not a useState lazy initializer: localStorage is undefined
  // during SSR, so reading it in the initializer would make the server
  // render zero panels and the client's first render render real ones — a
  // hydration mismatch. Starting empty and syncing after mount (this
  // effect) is the correct fix for that, which is exactly the "sync with
  // an external system after mount" case react-hooks/set-state-in-effect's
  // own message calls out as fine — its static check just can't tell this
  // apart from the fetch-then-setState shape it's actually meant to flag.
  useEffect(() => {
    const stored = readStoredOpenSessions();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSessionIds(stored.filter((id) => ongoing.some((s) => s.sessionId === id)));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(OPEN_SESSIONS_STORAGE_KEY, JSON.stringify(openSessionIds));
  }, [openSessionIds, hydrated]);

  useEffect(() => {
    openSessionIdsRef.current = openSessionIds;
    // A panel that's open is, by definition, not unread — covers both
    // openPanel() and the localStorage-restored set on first mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnreadSessionIds((prev) => {
      if (openSessionIds.every((id) => !prev.has(id))) return prev;
      const next = new Set(prev);
      for (const id of openSessionIds) next.delete(id);
      return next;
    });
  }, [openSessionIds]);

  useEffect(() => {
    const poll = setInterval(() => {
      void refreshQueue();
      void refreshOngoing();
    }, POLL_INTERVAL_MS);

    // Same push-plus-poll-fallback pattern as the old ListenerQueueList
    // (T1.5) — a claim by any Listener changes both the shared waiting
    // queue and (for the claimer) their own ongoing list. role:"listener"
    // with no chatId also grants this connection presence-only capability
    // on every chat this Listener currently has claimed (see the Ably
    // token route) — the same connection doubles as FR-11.4's dashboard-
    // wide online/last-online source, rather than opening one connection
    // per claimed chat.
    const ably = new Ably.Realtime({ authUrl: "/api/ably/token", authParams: { role: "listener" } });
    ablyRef.current = ably;
    const channel = ably.channels.get("queue");
    const handleUpdate = () => {
      void refreshQueue();
      void refreshOngoing();
    };
    channel.subscribe("update", handleUpdate).catch(() => {});

    return () => {
      clearInterval(poll);
      channel.unsubscribe("update", handleUpdate);
      ably.close();
      ablyRef.current = null;
    };
  }, []);

  const claimedIdsKey = useMemo(
    () => ongoing.map((s) => s.sessionId).sort().join(","),
    [ongoing],
  );

  // FR-11.4 — keeps the shared connection's presence subscriptions in sync
  // with whichever chats are currently claimed. Imperative diff against
  // presenceChannelsRef rather than a per-render subscribe/unsubscribe:
  // channels that are still claimed stay subscribed across re-renders,
  // only the actual additions/removals touch the network.
  useEffect(() => {
    const ably = ablyRef.current;
    if (!ably) return;

    const claimedIds = new Set(ongoing.map((s) => s.sessionId));
    const subscribed = presenceChannelsRef.current;

    // Removing a subscription needs no new capability, so it doesn't wait
    // on re-authorization below.
    for (const [sessionId, channel] of subscribed) {
      if (claimedIds.has(sessionId)) continue;
      channel.presence.unsubscribe();
      channel.unsubscribe("message");
      ably.channels.release(`chat:${sessionId}`);
      subscribed.delete(sessionId);
      setVisitorOnline((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }

    const newIds = [...claimedIds].filter((id) => !subscribed.has(id));
    if (newIds.length === 0) return;

    let cancelled = false;
    // Re-authorize and *wait* for it before subscribing: a newly-claimed
    // chat's presence capability is computed server-side from the caller's
    // current claimed list (see the Ably token route), so attaching with
    // the connection's existing token would 401 against a channel it
    // doesn't know about yet — caught live in T5.7's verification pass
    // (Ably console: "Channel denied access based on given capability").
    ably.auth
      .authorize()
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        for (const sessionId of newIds) {
          if (subscribed.has(sessionId)) continue;
          const channel = ably.channels.get(`chat:${sessionId}`);
          const refresh = async () => {
            try {
              const members = await channel.presence.get();
              setVisitorOnline((prev) => ({ ...prev, [sessionId]: members.some((m) => m.clientId === "visitor") }));
            } catch {
              // A presence read failing shouldn't break the dashboard —
              // same never-block-core-function posture as the typing
              // indicator's.
            }
          };
          channel.presence.subscribe(["enter", "update", "leave"], () => void refresh()).catch(() => {});
          void refresh();

          // Covers the case ListenerChat's own onVisitorMessage callback
          // can't: a message arriving on a chat that's claimed but whose
          // panel was never opened, so no ListenerChat instance exists yet
          // to notice it. Skip when the panel *is* open — ListenerChat
          // already handles that message (sound + notifyNewMessage), and
          // an open panel isn't "unread" by definition.
          channel.subscribe("message", (msg: Ably.Message) => {
            const payload = msg.data as { sender?: string };
            if (payload.sender !== "VISITOR") return;
            if (openSessionIdsRef.current.includes(sessionId)) return;
            setUnreadSessionIds((prev) => (prev.has(sessionId) ? prev : new Set(prev).add(sessionId)));
            notifyNewMessage();
          }).catch(() => {});

          subscribed.set(sessionId, channel);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedIdsKey]);

  const sortedOngoing = useMemo(
    () =>
      [...ongoing].sort(
        (a, b) =>
          sortValue(a, sortBy, visitorOnline[a.sessionId] ?? false) -
          sortValue(b, sortBy, visitorOnline[b.sessionId] ?? false),
      ),
    [ongoing, sortBy, visitorOnline],
  );

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPanel(sessionId: string) {
    setOpenSessionIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
  }

  function closePanel(sessionId: string) {
    setOpenSessionIds((prev) => prev.filter((id) => id !== sessionId));
  }

  async function claimEntries(ids: string[]) {
    if (ids.length === 0) return;
    setClaimingIds((prev) => new Set([...prev, ...ids]));
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/queue/${id}/claim`, { method: "POST" });
          if (!res.ok) return null;
          const data = (await res.json()) as { sessionId: string };
          return data.sessionId;
        }),
      );
      const claimedSessionIds = results.filter((id): id is string => id !== null);
      setOpenSessionIds((prev) => [
        ...prev,
        ...claimedSessionIds.filter((id) => !prev.includes(id)),
      ]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      await Promise.all([refreshQueue(), refreshOngoing()]);
    } finally {
      setClaimingIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
        <section className="nb bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg">{t.admin.dashboard.queue}</h2>
            <button
              onClick={() => void claimEntries(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || claimingIds.size > 0}
              className="nb-pill nb-press bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.admin.dashboard.claim} {selectedIds.size > 0 ? selectedIds.size : ""}
            </button>
          </div>

          {queue.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t.admin.dashboard.nobodyWaiting}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {queue.map((entry) => (
                <li
                  key={entry.id}
                  className="nb-sm flex items-center justify-between gap-2 bg-bg px-3 py-2"
                >
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelected(entry.id)}
                      className="h-4 w-4"
                    />
                    <span>
                      <span className="font-display">#{entry.position}</span>{" "}
                      <span className="text-ink/70">
                        {entry.displayName ?? t.admin.dashboard.anonymous} —{" "}
                        {t.admin.dashboard.waitingSince}{" "}
                        {formatDurationAgo(entry.joinedAt, t.admin.dashboard)}
                      </span>
                    </span>
                  </label>
                  <button
                    onClick={() => void claimEntries([entry.id])}
                    disabled={claimingIds.has(entry.id)}
                    className="nb-sm nb-press-sm shrink-0 bg-surface px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingIds.has(entry.id) ? t.admin.dashboard.claiming : t.admin.dashboard.claim}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FR-11.1/11.2/11.3/11.4/11.5 — the claimed-chat list, distinct
            from the open transcript panels below: who claimed it, the
            visitor, when they last replied, and whether they're online
            right now, all visible without opening a panel. */}
        <section className="nb bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg">{t.admin.dashboard.ongoingChats}</h2>
            <div className="flex items-center gap-3">
              {notifyPermission !== "unsupported" && notifyPermission !== "denied" && (
                <button
                  onClick={() => void toggleDesktopNotifications()}
                  aria-pressed={desktopEnabled}
                  title={desktopEnabled ? t.admin.dashboard.notifyOn : t.admin.dashboard.notifyOff}
                  className={`transition hover:text-ink ${desktopEnabled ? "text-ink" : "text-ink/40"}`}
                >
                  <BellIcon filled={desktopEnabled} />
                </button>
              )}
              {isAdmin && (
                <Link
                  href="/admin/archive"
                  className="text-xs font-bold text-accent-2-text underline-offset-2 hover:underline"
                >
                  {t.admin.dashboard.viewArchive}
                </Link>
              )}
            </div>
          </div>

          {ongoing.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70">{t.admin.dashboard.noClaimedChats}</p>
          ) : (
            <>
              <label className="mt-3 flex items-center gap-2 text-xs text-ink/70">
                {t.admin.dashboard.sortBy}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="nb-sm bg-bg px-2 py-1 text-xs text-ink"
                >
                  <option value="lastOnline">{t.admin.dashboard.sortLastOnline}</option>
                  <option value="lastAnswered">{t.admin.dashboard.sortLastAnswered}</option>
                </select>
              </label>

              <ul className="mt-3 flex flex-col gap-2">
                {sortedOngoing.map((session) => {
                  const isOpen = openSessionIds.includes(session.sessionId);
                  const online = visitorOnline[session.sessionId] ?? false;
                  const isUnread = unreadSessionIds.has(session.sessionId);
                  return (
                    <li key={session.sessionId}>
                      <button
                        onClick={() => openPanel(session.sessionId)}
                        className={`nb-sm flex w-full flex-col gap-1 bg-bg px-3 py-2 text-left text-sm transition hover:bg-surface ${
                          isOpen ? "border-accent-2-text" : ""
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 font-bold">
                            {isUnread && (
                              <span
                                aria-hidden
                                className="h-2 w-2 shrink-0 rounded-full bg-error-text"
                              />
                            )}
                            {session.displayName ?? t.admin.dashboard.anonymous}
                            {isUnread && (
                              <span className="sr-only">{t.admin.dashboard.unread}</span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-ink/70">
                            <span
                              aria-hidden
                              className={`h-2 w-2 rounded-full ${online ? "bg-success-text" : "bg-ink/30"}`}
                            />
                            {online
                              ? t.admin.dashboard.online
                              : session.visitorLastSeenAt
                                ? `${t.admin.dashboard.lastOnline}: ${formatDurationAgo(session.visitorLastSeenAt, t.admin.dashboard)}`
                                : t.admin.dashboard.lastOnline}
                          </span>
                        </span>
                        <span className="text-xs text-ink/70">
                          {t.admin.dashboard.claimedBy} {session.listenerDisplayName?.trim() || listenerName}
                        </span>
                        <span className="text-xs text-ink/70">
                          {session.lastVisitorMessageAt
                            ? `${t.admin.dashboard.sinceLastReply}: ${formatDurationAgo(session.lastVisitorMessageAt, t.admin.dashboard)}`
                            : t.admin.dashboard.noMessagesYet}
                        </span>
                        {isOpen && (
                          <span className="text-xs font-bold text-accent-2-text">{t.admin.dashboard.open}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Max two panels per row, wrapping to further rows instead of the
          old single-row-plus-horizontal-scroll layout — on a wide screen
          you scroll the page down to see more chats, never sideways. */}
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        {openSessionIds.length === 0 && (
          <p className="text-sm text-ink/70">{t.admin.dashboard.emptyPanels}</p>
        )}
        {openSessionIds.map((sessionId) => {
          const info = ongoing.find((s) => s.sessionId === sessionId);
          const visitorName = info?.displayName ?? t.admin.dashboard.anonymous;
          return (
            <div key={sessionId} className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{visitorName}</span>
                <button
                  onClick={() => closePanel(sessionId)}
                  aria-label={t.admin.dashboard.closePanel}
                  className="text-ink/70 transition hover:text-ink"
                >
                  ✕
                </button>
              </div>
              <ListenerChat
                sessionId={sessionId}
                visitorName={visitorName}
                listenerName={listenerName}
                onVisitorMessage={notifyNewMessage}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10a6 6 0 1 1 12 0c0 3.5 1.5 5 1.5 5h-15S6 13.5 6 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
