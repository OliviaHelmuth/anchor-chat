"use client";

import { useState } from "react";

type Application = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date | string;
};

export function ApplicationsReview({
  initialPending,
  initialReviewed,
}: {
  initialPending: Application[];
  initialReviewed: Application[];
}) {
  const [pending, setPending] = useState(initialPending);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/applications/${id}/${action}`, { method: "POST" });
      if (!res.ok) return;
      const application = pending.find((a) => a.id === id);
      setPending((prev) => prev.filter((a) => a.id !== id));
      if (application) {
        setReviewed((prev) => [
          { ...application, status: action === "approve" ? "APPROVED" : "REJECTED" },
          ...prev,
        ]);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted">Nothing waiting on review.</p>}
        <ul className="flex flex-col gap-3">
          {pending.map((application) => (
            <li
              key={application.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-5 py-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{application.name}</span>
                <span className="text-xs text-muted">{application.email}</span>
              </div>
              <p className="text-sm text-muted">{application.message}</p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => decide(application.id, "approve")}
                  disabled={busyId === application.id}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(application.id, "reject")}
                  disabled={busyId === application.id}
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold transition hover:bg-background disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg">Reviewed</h2>
        {reviewed.length === 0 && <p className="text-sm text-muted">No decisions yet.</p>}
        <ul className="flex flex-col gap-2">
          {reviewed.map((application) => (
            <li
              key={application.id}
              className="flex items-center justify-between rounded-xl border border-border px-5 py-3 text-sm"
            >
              <span>
                {application.name} <span className="text-muted">({application.email})</span>
              </span>
              <span
                className={
                  application.status === "APPROVED" ? "text-emerald-600" : "text-muted"
                }
              >
                {application.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
