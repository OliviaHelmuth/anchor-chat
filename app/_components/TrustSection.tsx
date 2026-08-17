const FACTS = [
  {
    title: "Actually anonymous",
    body: "No name, no date of birth, no address — ever. We don't ask, so we can't leak it. Leaving an email or passkey to resume later is optional.",
  },
  {
    title: "A real person replies",
    body: "Every chat is picked up by a volunteer counselor, not a bot pretending to be one. (An AI assistant is on the way — clearly labeled when it lands.)",
  },
  {
    title: "Free. No catch.",
    body: "No subscription, no “first session free,” no upsell. This isn't a business model with you as the product.",
  },
  {
    title: "Built in the open",
    body: "This is a practice project, not a company — the code, the data model, and the design decisions are all public. See the footer.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs tracking-widest text-accent-2">
          03 — WHY YOU CAN TRUST THIS
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          We know &ldquo;trust us&rdquo; isn&apos;t enough.
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <div
              key={fact.title}
              className="rounded-2xl bg-accent-2-tint p-6"
            >
              <h3 className="font-semibold text-ink">{fact.title}</h3>
              <p className="mt-2 text-sm text-muted">{fact.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
