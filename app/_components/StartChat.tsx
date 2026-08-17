"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartChat() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleStart() {
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/chat/start", { method: "POST" });
      if (!res.ok) throw new Error("start failed");
      // The server component reads the session cookie the API just set —
      // refresh() re-runs it instead of a client-side redirect guessing
      // what to show.
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleStart}
        disabled={pending}
        className="rounded-full bg-teal-700 px-8 py-3 text-base font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Starting…" : "Start chat"}
      </button>
      {error && (
        <p className="text-sm text-red-600">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
