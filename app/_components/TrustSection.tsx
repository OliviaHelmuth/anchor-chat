"use client";

import { useI18n } from "@/lib/i18n";

export function TrustSection() {
  const { t } = useI18n();

  return (
    <section id="trust" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-accent-2-text">
          {t.trust.eyebrow}
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          {t.trust.heading}
        </h2>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">
          {t.trust.facts.map((fact) => (
            <div key={fact.title} className="nb bg-accent-2-tint p-5 sm:p-6">
              <h3 className="font-bold text-ink">{fact.title}</h3>
              <p className="mt-2 text-sm text-ink">{fact.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
