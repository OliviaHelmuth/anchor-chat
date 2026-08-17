const STEPS = [
  {
    n: "1",
    title: "Hit chat now",
    body: "No sign-up, no form, no explaining yourself first. You're straight into the queue.",
  },
  {
    n: "2",
    title: "See your spot, live",
    body: "A real wait estimate, updating in real time — not a static “we'll be with you shortly.”",
  },
  {
    n: "3",
    title: "Talk to an actual person",
    body: "A volunteer counselor picks it up. You can leave an email or set up a passkey if you want to pick it back up later — totally optional.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-muted">
          02 — HOW IT WORKS
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          Three steps. No paperwork.
        </h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-sm text-bg">
                {step.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
