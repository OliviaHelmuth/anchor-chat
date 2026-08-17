"use client";

import { useI18n } from "@/lib/i18n";

export function FAQSection() {
  const { t } = useI18n();

  return (
    <section id="faq" className="bg-surface px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="font-display text-xs tracking-widest text-accent-2-text">
          {t.faq.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
          {t.faq.heading}
        </h2>

        <div className="nb mt-8 divide-y-[3px] divide-ink overflow-hidden sm:mt-10">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group bg-bg open:bg-accent-3/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left font-bold marker:content-none sm:px-6">
                {item.q}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-ink transition group-open:rotate-180"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <p className="px-4 pb-5 text-sm text-ink sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
