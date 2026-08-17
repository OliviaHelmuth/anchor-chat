"use client";

import { useState, type FormEvent } from "react";

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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface px-8 py-10 text-center">
        <h1 className="font-display text-2xl">Listener sign-in</h1>
        <p className="text-sm text-muted">
          No self-serve signup — accounts are seeded by the admin. Enter your
          Listener email and we&apos;ll send a sign-in link.
        </p>

        {sent ? (
          <p className="text-sm text-muted">Check your email for a sign-in link.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-border px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send link"}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
