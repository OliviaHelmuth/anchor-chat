"use client";

import { useI18n } from "@/lib/i18n";

export function QueuePageHeading({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="font-display text-3xl">{t.admin.queuePage.title}</h1>
      <p className="text-sm text-ink/70">
        {isAdmin ? t.admin.queuePage.signedInAdmin : t.admin.queuePage.signedInListener}
      </p>
    </div>
  );
}
