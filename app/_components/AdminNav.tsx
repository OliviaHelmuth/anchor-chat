"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SignOutButton } from "./SignOutButton";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

// Distinct from the public Nav — this is the Listener/admin's working
// surface, not the marketing landing page, so it drops the "How it
// works"/"Privacy" anchor links (meaningless off the landing page) and
// swaps the "Login" CTA for a role-aware nav + sign-out. Same brutalist
// system, tokens, and "!" mark as Nav.tsx so light/dark mode behaves
// identically here — an earlier version used a fixed dark bar (bg-ink
// text-bg) meant to always read as "the tool," but --ink/--bg are
// theme-reactive now that dark mode exists, so that combo would have
// flipped to a *light* bar in dark mode. Matching Nav.tsx's actual
// light/dark-aware tokens avoids that and satisfies "should look the same
// as the landing page" directly.
export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/listener/queue" className="flex items-center gap-2.5 sm:gap-3">
          <span
            aria-hidden
            className="nb-sm flex h-7 w-7 shrink-0 rotate-3 items-center justify-center bg-accent-3 font-display text-sm text-accent-3-ink sm:h-8 sm:w-8"
          >
            !
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base tracking-tight">
              overshare<span className="text-accent-2-text">.io</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
              {t.admin.nav.subtitle}
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-ink sm:gap-x-5">
          <Link href="/listener/queue" className="hover:text-accent-2-text">
            {t.admin.nav.dashboard}
          </Link>
          <Link href="/listener/profile" className="hover:text-accent-2-text">
            {t.admin.nav.yourProfile}
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/applications" className="hover:text-accent-2-text">
                {t.admin.nav.applications}
              </Link>
              <Link href="/admin/listeners" className="hover:text-accent-2-text">
                {t.admin.nav.listeners}
              </Link>
            </>
          )}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <SignOutButton>{t.admin.nav.signOut}</SignOutButton>
        </nav>
      </div>
    </header>
  );
}
