"use client";

import { useState, type FormEvent } from "react";

export function ApplyForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "request failed");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.message !== "request failed" ? err.message : "Couldn't submit that. Try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-border bg-surface px-6 py-8 text-sm text-muted">
        Thanks — Menty B reviews every application personally. We&apos;ll email
        you at the address you gave once there&apos;s a decision.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="apply-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="apply-name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apply-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="apply-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apply-message" className="text-sm font-medium">
          Why do you want to be a Listener?
        </label>
        <textarea
          id="apply-message"
          required
          rows={5}
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded border border-border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit application"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
