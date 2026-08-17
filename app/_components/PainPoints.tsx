const SCENARIOS = [
  {
    tag: "the group chat",
    line: "Family drama has its own extended universe at this point.",
  },
  {
    tag: "the situationship",
    line: "Everyone's “kind of seeing someone” and you're kind of not.",
  },
  {
    tag: "the hobby",
    line: "Gaming till 4am because your room is quieter than your head.",
  },
  {
    tag: "the neighbors",
    line: "Beef over noise, except the noise is mostly your own thoughts.",
  },
  {
    tag: "the scroll",
    line: "Three hours gone and you couldn't tell anyone what you watched.",
  },
  {
    tag: "the status update",
    line: "“Fine.” Everything's fine. (It's not really fine.)",
  },
];

export function PainPoints() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-muted">
          01 — SOUND FAMILIAR?
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          You don&apos;t need a crisis to talk to us.
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <div
              key={s.tag}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <span className="inline-block rounded-full bg-accent-2-tint px-3 py-1 text-xs font-semibold text-accent-2">
                {s.tag}
              </span>
              <p className="mt-4 text-base leading-snug">{s.line}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-lg text-center text-lg text-muted">
          Whatever it is — small, huge, hard to explain — it doesn&apos;t have
          to make sense yet. That&apos;s what the chat is for.
        </p>
      </div>
    </section>
  );
}
