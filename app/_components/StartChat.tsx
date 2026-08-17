"use client";

import { useState } from "react";
import { useChatWidget } from "./ChatWidgetContext";

export function StartChat() {
  const { openWidget } = useChatWidget();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleStart() {
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/chat/start", { method: "POST" });
      if (!res.ok) throw new Error("start failed");
      // ChatWidget (fixed bottom-right) picks up the entry this just
      // created and fetches its own position data — no page navigation.
      openWidget();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleStart}
        disabled={pending}
        className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Chat now — it's free"}
      </button>
      {error && (
        <p className="text-sm text-red-600">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
