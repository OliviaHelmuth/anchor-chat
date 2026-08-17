"use client";

import * as Ably from "ably";
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
  const [state, setState] = useState<Position>(initial);
  const fetchingRef = useRef(false);

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
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-lg">
        You&apos;re <span className="font-semibold">#{state.position}</span> in line
      </p>
      <p className="text-sm text-neutral-500">
        Estimated wait: {formatWait(state.waitSeconds)}
      </p>
      <p className="mt-4 max-w-sm text-xs text-neutral-400">
        Someone will be with you as soon as they&apos;re free. You don&apos;t need to do
        anything else right now.
      </p>

      {!identified && (
        <div className="mt-2 flex flex-col items-center gap-2 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-400">
            Want to be able to pick this back up later?
          </p>
          <BindIdentity />
        </div>
      )}
    </div>
  );
}
