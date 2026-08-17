"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "anchor_cookie_consent";

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this genuinely can't be
    // computed at render time — this is the "sync with a browser-only API
    // on mount" case the lint rule's cascading-render warning isn't
    // targeting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "essential-only");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-ink bg-surface px-4 py-4">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          {t.cookie.text}{" "}
          <Link href="/datenschutz" className="underline text-ink">
            {t.cookie.privacy}
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="nb-pill nb-press shrink-0 bg-accent-3 px-5 py-2 text-sm font-bold text-accent-3-ink"
        >
          {t.cookie.accept}
        </button>
      </div>
    </div>
  );
}
