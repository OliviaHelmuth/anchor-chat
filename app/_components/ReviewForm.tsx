"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ReviewForm({ listenerId }: { listenerId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/listeners/${listenerId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not submit review");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        required
        rows={3}
        maxLength={2000}
        placeholder="Leave a peer review…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="rounded border border-border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post review"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
