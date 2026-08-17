"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState } from "react";

type Entry = { id: string; position: number; joinedAt: Date | string };

const POLL_INTERVAL_MS = 20_000;

function formatWaitingSince(joinedAt: Date | string): string {
  const ms = Date.now() - new Date(joinedAt).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

export function ListenerQueueList({ initial }: { initial: Entry[] }) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/queue");
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { entries: Entry[] };
          setEntries(data.entries);
        }
      } finally {
        fetchingRef.current = false;
      }
    }

    // Same push-plus-poll-fallback pattern as WaitingRoom (T1.5) — a
    // Listener's queue view is exactly as latency-sensitive as a visitor's.
    const poll = setInterval(refresh, POLL_INTERVAL_MS);

    const ably = new Ably.Realtime({ authUrl: "/api/ably/token" });
    const channel = ably.channels.get("queue");
    channel.subscribe("update", refresh).catch(() => {});

    return () => {
      cancelled = true;
      clearInterval(poll);
      channel.unsubscribe("update", refresh);
      ably.close();
    };
  }, []);

  async function handleClaim(id: string) {
    setClaimingId(id);
    try {
      const res = await fetch(`/api/queue/${id}/claim`, { method: "POST" });
      if (res.ok) {
        // Optimistic remove — the Ably-triggered refresh will also confirm
        // this, but there's no reason to wait for it just to update our own view.
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
      }
    } finally {
      setClaimingId(null);
    }
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted">Nobody&apos;s waiting right now.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-3"
        >
          <div>
            <span className="font-display text-lg">#{entry.position}</span>
            <span className="ml-3 text-sm text-muted">
              waiting since {formatWaitingSince(entry.joinedAt)}
            </span>
          </div>
          <button
            onClick={() => handleClaim(entry.id)}
            disabled={claimingId === entry.id}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
          >
            {claimingId === entry.id ? "Claiming…" : "Claim"}
          </button>
        </li>
      ))}
    </ul>
  );
}
