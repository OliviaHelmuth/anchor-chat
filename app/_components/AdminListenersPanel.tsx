"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Review = { id: string; body: string; authorDisplayName: string | null };
type ListenerRow = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  reviews: Review[];
};

export function AdminListenersPanel({ initial }: { initial: ListenerRow[] }) {
  const { t } = useI18n();
  const [listeners, setListeners] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function removeListing(id: string) {
    if (!confirm(t.admin.listenersPanel.removeConfirm)) return;
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
        <li key={listener.id} className="nb bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="font-bold">
              {listener.displayName ?? t.admin.listenersPanel.noDisplayName}{" "}
              {listener.isAdmin && (
                <span className="text-xs text-ink/70">· {t.admin.listenersPanel.admin}</span>
              )}
            </span>
            <span className="text-xs text-ink/70">{listener.email}</span>
          </div>

          {listener.reviews.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {listener.reviews.map((review) => (
                <li key={review.id} className="flex flex-col items-start gap-1 text-sm sm:flex-row sm:justify-between sm:gap-3">
                  <span className="text-ink/70">
                    &ldquo;{review.body}&rdquo; —{" "}
                    {review.authorDisplayName ?? t.admin.listenersPanel.aListener}
                  </span>
                  <button
                    onClick={() => removeReview(listener.id, review.id)}
                    disabled={busyId === review.id}
                    className="shrink-0 text-xs text-error-text underline disabled:opacity-60"
                  >
                    {t.admin.listenersPanel.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!listener.isAdmin && (
            <button
              onClick={() => removeListing(listener.id)}
              disabled={busyId === listener.id}
              className="mt-3 text-xs text-error-text underline disabled:opacity-60"
            >
              {t.admin.listenersPanel.removeListing}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
