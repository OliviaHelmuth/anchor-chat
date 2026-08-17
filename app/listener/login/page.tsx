"use client";

import { useState, type FormEvent } from "react";
import { Nav } from "@/app/_components/Nav";

// Redesigned onto the neo-brutalist system the rest of the site already
// uses — this page had never been touched since it shipped (Milestone 3),
// so it was still the pre-rebrand rounded-card/muted-text look with no
// branded header. English-only, same as ChatWidget/BindIdentity
// (docs/technical-requirements.md) — this is a pre-auth utility page, not
// part of the DE/EN landing-page rollout.
export default function ListenerLoginPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-listener-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("request failed");
      // Same response whether or not the email matches a seeded Listener —
      // see app/api/auth/request-listener-login/route.ts.
      setSent(true);
    } catch {
      setError("Couldn't send that link. Try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="nb mx-auto flex w-full max-w-sm flex-col items-center gap-4 bg-surface px-6 py-10 text-center sm:px-10 sm:py-12">
          <h1 className="font-display text-2xl sm:text-3xl">Listener sign-in</h1>
          <p className="text-sm text-ink/70">
            No self-serve signup — accounts are seeded by the admin. Enter your
            Listener email and we&apos;ll send a sign-in link.
          </p>

          {sent ? (
            <p className="text-sm text-ink/70">Check your email for a sign-in link.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink placeholder:text-ink/50"
              />
              <button
                type="submit"
                disabled={pending}
                className="nb-pill nb-press bg-accent px-6 py-2.5 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send link"}
              </button>
            </form>
          )}

          {error && <p className="text-sm text-error-text">{error}</p>}
        </div>
      </main>
    </>
  );
}
