"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t-[3px] border-ink bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          <div>
            <span className="font-display text-base">
              overshare<span className="text-accent-2-text">.io</span>
            </span>
            <p className="mt-3 max-w-xs text-sm text-ink">{t.footer.tagline}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">
              {t.footer.product}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#how-it-works" className="hover:underline">
                  {t.footer.howItsUsed}
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:underline">
                  {t.footer.trust}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:underline">
                  {t.nav.faq}
                </a>
              </li>
              <li>
                <a href="#chat" className="hover:underline">
                  {t.footer.startChat}
                </a>
              </li>
              <li>
                <Link href="/apply" className="hover:underline">
                  {t.footer.becomeListener}
                </Link>
              </li>
              <li>
                <Link href="/listeners" className="hover:underline">
                  {t.footer.meetListeners}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink">
              {t.footer.legal}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/impressum" className="hover:underline">
                  {t.footer.impressum}
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:underline">
                  {t.footer.datenschutz}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t-2 border-border pt-6 text-xs text-ink sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} overshare.io.</p>
          <p>
            {t.footer.disclaimer}{" "}
            <a
              href="https://github.com/OliviaHelmuth/anchor-chat"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.footer.viewCode}
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
