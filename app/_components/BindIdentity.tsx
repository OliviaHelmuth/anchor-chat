"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

type Mode = "closed" | "email" | "email-sent" | "phone" | "phone-verify" | "done";

async function postJson(url: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function BindIdentity() {
  const [mode, setMode] = useState<Mode>("closed");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const ok = await postJson("/api/auth/request-magic-link", { email });
    setPending(false);
    if (ok) setMode("email-sent");
    else setError("Couldn't send that link. Try again in a minute.");
  }

  async function handlePhoneRequest(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const ok = await postJson("/api/auth/request-otp", { phone });
    setPending(false);
    if (ok) setMode("phone-verify");
    else setError("Couldn't send a code. Try again in a minute.");
  }

  async function handlePhoneVerify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("otp-sms-auth", { phone, code, redirect: false });
    setPending(false);
    if (result?.ok) setMode("done");
    else setError("That code didn't match. Check it and try again.");
  }

  if (mode === "closed") {
    return (
      <div className="flex gap-3 text-xs text-neutral-500">
        <button onClick={() => setMode("email")} className="underline">
          Email me a link
        </button>
        <span aria-hidden>·</span>
        <button onClick={() => setMode("phone")} className="underline">
          Text me a code
        </button>
      </div>
    );
  }

  if (mode === "email-sent") {
    return <p className="text-xs text-neutral-500">Check your email for a sign-in link.</p>;
  }

  if (mode === "done") {
    return <p className="text-xs text-neutral-500">You&apos;re set — this chat will find you.</p>;
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send link"}
          </button>
        </form>
      )}

      {mode === "phone" && (
        <form onSubmit={handlePhoneRequest} className="flex w-full flex-col gap-2">
          <input
            type="tel"
            required
            placeholder="+49…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send code"}
          </button>
        </form>
      )}

      {mode === "phone-verify" && (
        <form onSubmit={handlePhoneVerify} className="flex w-full flex-col gap-2">
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {pending ? "Checking…" : "Confirm code"}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
