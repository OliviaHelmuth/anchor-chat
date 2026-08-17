# Challenge 1 — Passwordless authentication

## Why this is likely to come up

Krisenchat's real `chat.krisenchat.de` deployment has **zero password
provider** — only phone/OTP, passkeys, and magic link (confirmed in
`research/krisenchat-recon.md` by calling their own `/api/auth/providers`
endpoint). For a service where the whole value proposition is "talk to us
without giving your name," a password (something you set, remember, and
that implies an account you "made") works against the product. A take-home
built around auth is likely to test whether you understand *why* that design
exists, not just whether you can wire up a library.

## How it actually works

**Magic link:**
1. User submits an email.
2. Server generates a random token, stores `{token, email, expiresAt}`,
   emails a link containing the token.
3. User clicks it; server looks up the token, checks it's unexpired and
   unused, marks it used, establishes a session.

The two failure modes worth being able to name: a **link that never
expires** (a stale email sitting in an inbox becomes a permanent skeleton
key), and a **link that can be replayed** (forwarding it, or an email
provider's link-prefetching security scanner clicking it before the real
user does — this genuinely happens and silently burns single-use tokens).

**OTP over SMS/email:**
Same shape, but the "token" is a short human-typeable code instead of a URL,
which trades link-based UX for typing friction, and needs its own brute-force
protection (a 6-digit code has only 1,000,000 possibilities — an attempt
limit and short expiry are load-bearing, not optional).

**Passkeys (WebAuthn):**
A public/private keypair generated on-device (often backed by a hardware
secure enclave); the server only ever stores the public key and a challenge/
response protocol proves possession of the private key. No secret ever
crosses the network — categorically different from the other two, which both
depend on a side channel (email/SMS) staying secure.

## What we built here

See `tasks/TASKS.md` Milestone 2. Magic link + OTP (logged to console instead
of real SMS — see `docs/hosting-and-scaling.md` for why no free SMS tier
exists). Passkeys are a stretch task.

## Questions to have a sharp answer for

- "Why not just use a password?" — friction + the anonymity promise; a
  password implies an account the user consciously "created," which cuts
  against a crisis service's low-barrier-to-entry goal.
- "How do you stop someone from requesting 1,000 magic links to spam an
  inbox?" — rate limit the request endpoint, not just the verify endpoint.
- "What happens if the email/SMS provider is compromised?" — both magic
  link and OTP inherit the security of that channel; passkeys don't, which
  is the actual argument for offering them as a third option rather than a
  redundant one.
