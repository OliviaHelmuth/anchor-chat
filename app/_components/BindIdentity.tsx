"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

type Mode = "closed" | "email" | "email-sent" | "done";

async function postJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { method: "POST" });
  return res.ok ? ((await res.json()) as T) : null;
}

type ChallengeResponse = { challengeId: string; options: unknown };

export function BindIdentity() {
  const [mode, setMode] = useState<Mode>("closed");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setPending(false);
    if (res.ok) setMode("email-sent");
    else setError("Couldn't send that link. Try again in a minute.");
  }

  async function handlePasskeyRegister() {
    setPending(true);
    setError(null);
    try {
      const started = await postJson<ChallengeResponse>("/api/auth/passkey/register-options");
      if (!started) throw new Error("no options");

      const response = await startRegistration({
        optionsJSON: started.options as Parameters<typeof startRegistration>[0]["optionsJSON"],
      });

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: started.challengeId, response }),
      });
      if (!verifyRes.ok) throw new Error("verify failed");
      setMode("done");
    } catch {
      setError("Couldn't set up a passkey — this device/browser may not support one, or the prompt was cancelled.");
    } finally {
      setPending(false);
    }
  }

  async function handlePasskeySignIn() {
    setPending(true);
    setError(null);
    try {
      const started = await postJson<ChallengeResponse>("/api/auth/passkey/auth-options");
      if (!started) throw new Error("no options");

      const response = await startAuthentication({
        optionsJSON: started.options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
      });

      const result = await signIn("passkeys", {
        challengeId: started.challengeId,
        response: JSON.stringify(response),
        redirect: false,
      });
      if (result?.ok) setMode("done");
      else setError("That passkey isn't recognized here.");
    } catch {
      setError("Sign-in was cancelled, or no passkey is set up for this site yet.");
    } finally {
      setPending(false);
    }
  }

  if (mode === "closed") {
    return (
      <div className="flex flex-col items-center gap-2 text-xs text-muted">
        <div className="flex gap-3">
          <button onClick={() => setMode("email")} className="underline">
            Email me a link
          </button>
          <span aria-hidden>·</span>
          <button onClick={handlePasskeyRegister} disabled={pending} className="underline">
            Set up a passkey
          </button>
        </div>
        <button onClick={handlePasskeySignIn} disabled={pending} className="underline">
          Already have a passkey for this site? Sign in
        </button>
        {/* Phone/SMS sign-in exists and is fully tested (auth.ts's
            otp-sms-auth provider) but isn't surfaced here — no free
            ongoing SMS tier exists to actually deliver a code to a real
            phone. See docs/hosting-and-scaling.md and
            docs/challenges/passwordless-auth.md. */}
        {error && <p className="text-error-text">{error}</p>}
      </div>
    );
  }

  if (mode === "email-sent") {
    return <p className="text-xs text-muted">Check your email for a sign-in link.</p>;
  }

  if (mode === "done") {
    return <p className="text-xs text-muted">You&apos;re set — this chat will find you.</p>;
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-ink px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send link"}
        </button>
      </form>

      {error && <p className="text-xs text-error-text">{error}</p>}
    </div>
  );
}
