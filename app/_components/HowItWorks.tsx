"use client";

import { useI18n } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useI18n();

  return (
    <section id="how-it-works" className="bg-surface px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-ink">
          {t.howItsUsed.eyebrow}
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          {t.howItsUsed.heading}
        </h2>

        <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="nb relative flex h-44 items-center justify-center gap-3 bg-accent-2 sm:h-56 sm:gap-4 md:h-64">
              <span className="nb-sm h-12 w-12 -rotate-6 bg-accent sm:h-16 sm:w-16 md:h-20 md:w-20" />
              <span className="nb-sm h-12 w-12 rotate-3 bg-accent-3 sm:h-16 sm:w-16 md:h-20 md:w-20" />
              <span className="nb-sm h-12 w-12 -rotate-3 bg-white sm:h-16 sm:w-16 md:h-20 md:w-20" />
            </div>
            <p className="mt-4 text-sm text-ink">{t.howItsUsed.cardCaption}</p>
          </div>

          <div className="grid gap-6 sm:gap-8">
            {t.howItsUsed.steps.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <span className="nb-sm flex h-10 w-10 shrink-0 items-center justify-center bg-ink font-display text-sm text-bg">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm text-ink">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
