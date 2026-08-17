const TICKER = [
  "gaming till 4am",
  "family group chat chaos",
  "no situationship, no dating",
  "neighbor beef",
  "3am spiral",
  "just... tired",
  "everyone's fine except you",
  "doom-scrolling for 3 hours",
];

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-10 sm:pt-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            ✦ No account. No diagnosis. No charge.
          </span>

          <h1 className="mt-6 font-display text-[15vw] leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            LIFE AIN&apos;T
            <br />
            <span className="bg-accent px-2 text-ink">LIVING RN.</span>
          </h1>

          <p className="mt-6 max-w-md text-lg text-muted">
            Family&apos;s stressing you out. Neighbor&apos;s stressing you out.
            You&apos;re stressing you out. Gaming too much, nobody to date,
            just <em className="not-italic text-ink">everything</em> — you
            don&apos;t need the right words. Just start typing.
          </p>

          <div id="chat" className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {children}
            <span
              aria-disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium text-muted"
            >
              Chat with our AI — coming soon
            </span>
          </div>

          <p className="mt-4 text-xs text-muted">
            🔒 Fully anonymous &nbsp;·&nbsp; 🕐 Real people, usually within
            minutes &nbsp;·&nbsp; 🆓 Always free
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="flex h-40 w-40 -rotate-6 flex-col items-center justify-center rounded-full bg-ink text-center text-bg sm:h-48 sm:w-48">
            <span className="text-2xl">☕</span>
            <span className="mt-1 font-display text-sm leading-tight">
              MORE ESPRESSO
            </span>
            <span className="font-display text-sm leading-tight text-accent">
              LESS DEPRESSO
            </span>
          </div>
        </div>
      </div>

      <div className="mt-14 overflow-hidden border-y border-border py-3">
        <div className="ticker flex w-max gap-3 motion-reduce:animate-none">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="shrink-0 rounded-full bg-surface px-4 py-1.5 text-sm text-muted"
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
