"use client";

import { useI18n } from "@/lib/i18n";

const TICKER_DE = [
  "Zocken bis 4 Uhr morgens",
  "ADHS-Brain macht Overtime",
  "schon wieder hyperfokussiert",
  "3-Uhr-Gedankenspirale",
  "exekutive Dysfunktion, again",
  "allen geht's gut, nur dir nicht",
  "3 Stunden gescrollt",
  "Meltdown lädt…",
];

const TICKER_EN = [
  "gaming till 4am",
  "ADHD brain won't shut up",
  "ok but hyperfixating rn",
  "3am spiral, again",
  "executive dysfunction era",
  "everyone's fine except you",
  "doom-scrolling for 3 hours",
  "meltdown loading…",
];

export function Hero({ children }: { children: React.ReactNode }) {
  const { t, locale } = useI18n();
  const ticker = locale === "de" ? TICKER_DE : TICKER_EN;

  return (
    <section className="relative px-4 pt-4 sm:px-6 sm:pt-10">
      <div className="nb relative mx-auto max-w-6xl bg-accent-2 px-5 py-12 text-accent-2-ink sm:px-12 sm:py-20">
        <div className="relative max-w-xl">
          <span className="nb-sm inline-flex items-center gap-1.5 bg-surface px-3 py-1 text-xs font-bold text-ink">
            {t.hero.badge}
          </span>

          <h1 className="mt-5 font-display text-4xl leading-[0.95] tracking-tight sm:mt-6 sm:text-6xl lg:text-7xl">
            {t.hero.headline1}
            <br />
            <span className="bg-accent px-2 text-accent-ink">{t.hero.headline2}</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-white/85 sm:mt-6 sm:text-lg">{t.hero.body}</p>

          <div id="chat" className="mt-7 sm:mt-8">
            {children}
          </div>

          <p className="mt-5 text-xs text-white/70 sm:mt-6">{t.hero.trustLine}</p>
        </div>
      </div>

      {/* Hidden easter egg — the original meme sticker, tucked off the
          bottom-left corner instead of front-and-center. Barely there until
          you look, same "more espresso, less depresso" line as before.
          Hidden below sm: on a narrow viewport it has nowhere to sit
          without overlapping the ticker strip right beneath it. */}
      <div
        title="more espresso, less depresso"
        className="nb nb-press absolute -bottom-4 left-10 z-10 hidden h-16 w-16 -rotate-12 cursor-default flex-col items-center justify-center bg-accent-3 text-center text-[9px] font-bold leading-none text-accent-3-ink opacity-70 transition-opacity hover:opacity-100 sm:flex"
      >
        <span className="text-base">☕</span>
        <span className="mt-0.5">MORE</span>
        <span>ESPRESSO</span>
      </div>

      <div className="nb-sm mx-auto mt-8 max-w-6xl overflow-hidden bg-surface py-3 sm:mt-10">
        <div className="ticker flex w-max gap-3 motion-reduce:animate-none">
          {[...ticker, ...ticker].map((item, i) => (
            <span
              key={i}
              className="nb-sm shrink-0 bg-bg px-4 py-1.5 text-sm font-semibold text-ink"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .ticker { animation: ticker-scroll 32s linear infinite; }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
