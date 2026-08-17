"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5">
          <span
            aria-hidden
            className="nb-sm flex h-7 w-7 shrink-0 rotate-3 items-center justify-center bg-accent-3 font-display text-sm text-accent-3-ink sm:h-8 sm:w-8"
          >
            !
          </span>
          <span className="font-display text-base tracking-tight sm:text-lg">
            overshare<span className="text-accent-2-text">.io</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-ink sm:flex">
          <a href="#how-it-works" className="hover:text-accent-2-text">
            {t.nav.howItsUsed}
          </a>
          <a href="#trust" className="hover:text-accent-2-text">
            {t.nav.trust}
          </a>
          <a href="#faq" className="hover:text-accent-2-text">
            {t.nav.faq}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link
            href="/listener/login"
            className="nb-pill nb-press bg-ink px-3 py-1.5 text-sm font-bold text-bg sm:px-4 sm:py-2"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
