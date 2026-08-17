"use client";

import { useI18n } from "@/lib/i18n";

export function AdminPageHeading({ page }: { page: "applications" | "listeners" }) {
  const { t } = useI18n();
  const copy = page === "applications" ? t.admin.applicationsPage : t.admin.listenersPage;
  return (
    <div>
      <h1 className="font-display text-3xl">{copy.title}</h1>
      <p className="text-sm text-ink/70">{copy.subtitle}</p>
    </div>
  );
}
