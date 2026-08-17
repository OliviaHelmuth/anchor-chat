"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "anchor_cookie_consent";

export function CookieBanner() {
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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          We only use cookies that keep the chat working — no tracking, no ad
          networks. See{" "}
          <Link href="/datenschutz" className="underline text-ink">
            Privacy
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-bg"
        >
          Okay
        </button>
      </div>
    </div>
  );
}
