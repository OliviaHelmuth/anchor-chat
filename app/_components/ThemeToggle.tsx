"use client";

import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "anchor_theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // The inline script in layout.tsx already set data-theme before paint —
  // this just mirrors it into state so the button icon matches on mount.
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    // React Strict Mode's dev-only remount resets <html> to only the
    // attributes JSX manages, clearing whatever the inline script set —
    // re-apply from localStorage so dev doesn't silently disagree with prod.
    const stored = localStorage.getItem(STORAGE_KEY);
    const resolved: Theme = stored === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="nb-sm nb-press-sm flex h-9 w-9 items-center justify-center bg-surface text-ink"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
