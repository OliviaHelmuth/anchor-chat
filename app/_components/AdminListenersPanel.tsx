"use client";

import { useState } from "react";

type Review = { id: string; body: string; authorDisplayName: string | null };
type ListenerRow = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  reviews: Review[];
};

export function AdminListenersPanel({ initial }: { initial: ListenerRow[] }) {
  const [listeners, setListeners] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function removeListing(id: string) {
    if (!confirm("Remove this Listener's listing? This can't be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/listeners/${id}`, { method: "DELETE" });
      if (res.ok) setListeners((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function removeReview(listenerId: string, reviewId: string) {
    setBusyId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) {
        setListeners((prev) =>
          prev.map((l) =>
            l.id === listenerId ? { ...l, reviews: l.reviews.filter((r) => r.id !== reviewId) } : l
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="flex flex-col gap-4">
      {listeners.map((listener) => (
        <li key={listener.id} className="rounded-xl border border-border bg-surface px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-semibold">
              {listener.displayName ?? "(no display name set)"}{" "}
              {listener.isAdmin && <span className="text-xs text-muted">· admin</span>}
            </span>
            <span className="text-xs text-muted">{listener.email}</span>
          </div>

          {listener.reviews.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {listener.reviews.map((review) => (
                <li key={review.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted">
                    &ldquo;{review.body}&rdquo; — {review.authorDisplayName ?? "A Listener"}
                  </span>
                  <button
                    onClick={() => removeReview(listener.id, review.id)}
                    disabled={busyId === review.id}
                    className="shrink-0 text-xs text-red-600 underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!listener.isAdmin && (
            <button
              onClick={() => removeListing(listener.id)}
              disabled={busyId === listener.id}
              className="mt-3 text-xs text-red-600 underline disabled:opacity-60"
            >
              Remove listing
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
