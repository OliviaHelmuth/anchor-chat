"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState } from "react";
import { BindIdentity } from "./BindIdentity";
import { useChatWidget } from "./ChatWidgetContext";

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

// Fixed bottom-right widget — replaces the old full-page waiting room.
// Renders nothing until there's an actual queue entry;
// StartChat (Hero's CTA) creates one and calls openWidget(), at which point
// this fetches its own position data rather than waiting on a page refresh.
export function ChatWidget({
  initial,
  identified,
}: {
  initial: Position | null;
  identified: boolean;
}) {
  const { open, openWidget, closeWidget } = useChatWidget();
  const [state, setState] = useState<Position | null>(initial);
  const [leaving, setLeaving] = useState(false);
  const fetchingRef = useRef(false);

  async function refresh() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/chat/position");
      setState(res.ok ? ((await res.json()) as Position) : null);
    } finally {
      fetchingRef.current = false;
    }
  }

  // Opened before we have position data yet — e.g. right after StartChat's
  // POST /api/chat/start creates the entry.
  useEffect(() => {
    if (open && !state) void refresh();
  }, [open, state]);

  useEffect(() => {
    if (!state) return;

    const poll = setInterval(refresh, POLL_INTERVAL_MS);
    const ably = new Ably.Realtime({ authUrl: "/api/ably/token" });
    const channel = ably.channels.get("queue");
    // subscribe() resolves once attached — in dev, React Strict Mode mounts
    // this effect twice, closing the first connection before it attaches.
    // That's an expected rejection, not a real failure; the poll above
    // covers us either way.
    channel.subscribe("update", refresh).catch(() => {});

    return () => {
      clearInterval(poll);
      channel.unsubscribe("update", refresh);
      ably.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state !== null]);

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/chat/leave", { method: "POST" });
      if (!res.ok) throw new Error("leave failed");
      setState(null);
    } finally {
      setLeaving(false);
    }
  }

  if (!state) return null;

  if (!open) {
    return (
      <button
        onClick={openWidget}
        aria-label="Reopen chat"
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-bg shadow-lg transition hover:opacity-90"
      >
        <ChatBubbleIcon />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 flex w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center justify-between bg-ink px-4 py-3">
        <span className="font-display text-sm text-bg">Anchor Chat</span>
        <button
          onClick={closeWidget}
          aria-label="Minimize chat"
          className="text-bg/70 transition hover:text-bg"
        >
          <MinimizeIcon />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {/* FR-5.5/FR-5.6's real message thread ships in Milestone 4 — until
            then this is a single system-style status message, not a fake
            transcript. Hiding the raw queue number when position is 1 is
            deliberate: "you're #1" reads like a wait, "you're connected"
            reads like what's actually about to happen. */}
        <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-bg px-3 py-2 text-sm">
          {state.position === 1
            ? "You're connected — a Listener will be with you any moment."
            : `You're #${state.position} in line — ${formatWait(state.waitSeconds)}.`}
        </div>

        <input
          disabled
          placeholder="Messaging opens once a Listener joins…"
          className="w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-muted"
        />

        {!identified && (
          <div className="flex flex-col items-center gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted">
              Want to be able to pick this back up later?
            </p>
            <BindIdentity />
          </div>
        )}

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="self-center text-xs text-muted underline underline-offset-2 transition hover:text-ink disabled:opacity-60"
        >
          {leaving ? "Leaving…" : "Leave the queue"}
        </button>
      </div>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h16v12H8l-4 4V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
