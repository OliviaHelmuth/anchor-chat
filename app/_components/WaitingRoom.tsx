"use client";

import * as Ably from "ably";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BindIdentity } from "./BindIdentity";

type Position = { position: number; waitSeconds: number };

const POLL_INTERVAL_MS = 20_000;

function formatWait(seconds: number): string {
  if (seconds <= 0) return "any moment now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "less than a minute";
  if (minutes === 1) return "about a minute";
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function WaitingRoom({
  initial,
  identified,
}: {
  initial: Position;
  identified: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<Position>(initial);
  const [leaving, setLeaving] = useState(false);
  const fetchingRef = useRef(false);

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/chat/leave", { method: "POST" });
      if (!res.ok) throw new Error("leave failed");
      // Same pattern as StartChat: let the server component re-read state
      // instead of guessing what to render client-side.
      router.refresh();
    } catch {
      setLeaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch("/api/chat/position");
        if (res.ok && !cancelled) {
          const data = (await res.json()) as Position;
          setState(data);
        }
      } finally {
        fetchingRef.current = false;
      }
    }

    // Push, when it arrives, is the fast path; the interval is the fallback
    // if a client's realtime connection ever drops silently — see
    // docs/hosting-and-scaling.md on degrading gracefully past the free tier.
    const poll = setInterval(refresh, POLL_INTERVAL_MS);

    const ably = new Ably.Realtime({ authUrl: "/api/ably/token" });
    const channel = ably.channels.get("queue");
    // subscribe() resolves once attached — in dev, React Strict Mode mounts
    // this effect twice, closing the first connection before it attaches.
    // That's an expected rejection, not a real failure; the poll above
    // covers us either way, so there's nothing to do but not let it surface
    // as an unhandled rejection.
    channel.subscribe("update", refresh).catch(() => {});

    return () => {
      cancelled = true;
      clearInterval(poll);
      channel.unsubscribe("update", refresh);
      ably.close();
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-8 py-10 text-center">
      <span className="font-display text-5xl">#{state.position}</span>
      <p className="text-sm text-muted">in line — {formatWait(state.waitSeconds)}</p>
      <p className="mt-4 max-w-sm text-xs text-muted">
        Someone will be with you as soon as they&apos;re free. You don&apos;t need to do
        anything else right now.
      </p>

      {!identified && (
        <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Want to be able to pick this back up later?
          </p>
          <BindIdentity />
        </div>
      )}

      <button
        onClick={handleLeave}
        disabled={leaving}
        className="mt-2 text-xs text-muted underline underline-offset-2 transition hover:text-ink disabled:opacity-60"
      >
        {leaving ? "Leaving…" : "Leave the queue"}
      </button>
    </div>
  );
}
