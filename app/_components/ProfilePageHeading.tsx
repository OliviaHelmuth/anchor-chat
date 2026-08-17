"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function ProfilePageHeading({ listenerId }: { listenerId: string }) {
  const { t } = useI18n();
  return (
    <div>
      <h1 className="font-display text-3xl">{t.admin.profilePage.title}</h1>
      <p className="mt-2 text-sm text-ink/70">
        {t.admin.profilePage.shownOn}{" "}
        <Link href={`/listeners/${listenerId}`} className="underline">
          {t.admin.profilePage.yourPublicPage}
        </Link>
        . {t.admin.profilePage.noRealName}
      </p>
    </div>
  );
}
