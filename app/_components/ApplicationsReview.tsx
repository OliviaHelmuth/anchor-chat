"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
        <h2 className="font-display text-lg">
          {t.admin.applications.pending.replace("{n}", String(pending.length))}
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-ink/70">{t.admin.applications.nothingWaiting}</p>
        )}
        <ul className="flex flex-col gap-3">
          {pending.map((application) => (
            <li key={application.id} className="nb flex flex-col gap-2 bg-surface px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="font-bold">{application.name}</span>
                <span className="text-xs text-ink/70">{application.email}</span>
              </div>
              <p className="text-sm text-ink/70">{application.message}</p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => decide(application.id, "approve")}
                  disabled={busyId === application.id}
                  className="nb-pill nb-press bg-accent px-4 py-1.5 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.admin.applications.approve}
                </button>
                <button
                  onClick={() => decide(application.id, "reject")}
                  disabled={busyId === application.id}
                  className="nb-pill nb-press-sm bg-surface px-4 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t.admin.applications.reject}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg">{t.admin.applications.reviewed}</h2>
        {reviewed.length === 0 && (
          <p className="text-sm text-ink/70">{t.admin.applications.noDecisionsYet}</p>
        )}
        <ul className="flex flex-col gap-2">
          {reviewed.map((application) => (
            <li
              key={application.id}
              className="nb-sm flex flex-col gap-1 bg-surface px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <span>
                {application.name} <span className="text-ink/70">({application.email})</span>
              </span>
              <span
                className={
                  application.status === "APPROVED" ? "text-success-text" : "text-ink/70"
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
