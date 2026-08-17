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

## What we actually built

Auth.js (`auth.ts`) with three custom Credentials providers — `magic-link`,
`otp-sms-auth`, and `passkeys` — matching krisenchat's real provider IDs
exactly, backed by our own tables, not Auth.js's built-in Email provider or
a database Adapter. That was a deliberate choice, not the path of least
resistance: Auth.js's normal Email-provider flow (and its built-in WebAuthn
support) assumes it owns a `User` model and creates one on first sign-in,
but T2.3's actual requirement is the opposite — bind the verified
email/phone/passkey to the **existing anonymous `Session`** row from
Milestone 1, never create a second identity. A Credentials provider's
`authorize()` gives full control over that binding; the built-in
Email/Adapter/WebAuthn flows don't — which is also why Auth.js's built-in
WebAuthn support (which *requires* a full Adapter) wasn't used here either;
`@simplewebauthn/server` does the actual protocol work instead, called from
inside `authorize()` just like the other two providers.

**OTP-SMS specifically is built and tested but not shown in the UI** — no
free ongoing SMS-delivery tier exists to send a real code to a real phone
(confirmed while researching `docs/hosting-and-scaling.md`), so surfacing it
would mean a button that quietly never works for a real visitor. The
provider, the rate limiting, the lockout — all still there and covered
below; only `app/_components/BindIdentity.tsx`'s UI was scoped back.

**What's genuinely worth being able to explain, verified live, not just in
theory:**

- **Both tokens are hashed at rest** (`lib/tokens.ts`, SHA-256) — the
  magic-link token because a DB leak or stray log line shouldn't hand out a
  working sign-in link even though it's unguessable by brute force; the OTP
  code because there's no reason to store a 6-digit number in the clear
  either, even though its real protection is the 5-attempt lockout, not hash
  strength.
- **Single-use is enforced by marking the token used *before* anything
  else** — confirmed by replaying a used token and getting rejected
  (`CredentialsSignin`), not just assumed.
- **Returning-visitor resume, the non-obvious part of T2.3.** If the email
  or phone being verified already belongs to a *different* Session (signing
  in from a new browser/device), `bindOrResumeByEmail`/`bindOrResumeByPhone`
  in `auth.ts` resume that original Session instead of leaving the identity
  split across two rows. Verified with two separate cookie jars: the second
  browser's `/api/auth/session` came back with the *first* browser's session
  id, not its own freshly-created one.
- **Rate limiting lives on the request step** (`/api/auth/request-magic-link`,
  `/api/auth/request-otp`), not the verify step — `lib/rate-limit.ts`, 5
  requests/minute/IP, fixed-window. Confirmed live: the 5th+6th rapid
  requests in a window return 429.
- **No real SMS or email required to fully test this.** OTP always logs to
  the server console (no free ongoing SMS tier exists — see
  `docs/hosting-and-scaling.md`). Magic link does the same
  (`lib/email.ts`) *unless* `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` are set, in
  which case it sends for real — same code path either way, so wiring up a
  real provider is a config change, not a rewrite.

**Passkeys — the part that needed real engineering, not just wiring:**

- **Registration and sign-in are two separate ceremonies**, both
  challenge/response: `generateRegistrationOptions`/`generateAuthenticationOptions`
  on the server, `startRegistration`/`startAuthentication` in the browser
  (`@simplewebauthn/browser`), then a server-side verify step. Both
  challenges are single-use, short-lived rows (`PasskeyChallenge`) — same
  anti-replay shape as the magic-link token, for the same reason.
- **Usernameless by design.** Registration sets `residentKey: "required"`
  and sign-in sends no `allowCredentials` list — the browser's own passkey
  picker is the identity lookup, not a prior email/username prompt. Identity
  resolution happens *after* the browser returns an assertion: we look up
  which `PasskeyCredential` owns the `credentialId` in the response, and
  that row's `sessionId` is who signed in — never the cookie of whichever
  browser initiated the attempt. Verified via the actual options responses:
  `register-options` returns `authenticatorSelection.residentKey: "required"`,
  `auth-options` returns no `allowCredentials` field at all.
- **The relying-party ID is derived per-request** (`lib/webauthn.ts`), not
  hardcoded, so the same code works against `localhost` in dev and the real
  Vercel domain in prod. The real constraint this creates: a passkey
  registered under one origin won't verify under another (a Vercel preview
  URL vs. the stable production alias, for instance) — WebAuthn ties a
  credential to the exact origin it was created on. Worth knowing before a
  live demo, not discovering during one.
- **What's actually unverifiable by an agent, and why:** the full
  registration/sign-in ceremony needs a real platform authenticator (Touch
  ID, a security key) — a biometric or device-password prompt that lives
  outside the page's DOM entirely. Confirmed everything short of that:
  well-formed options from both endpoints, an invalid/expired challenge
  correctly rejected with 400, and — when tried from an automated browser
  with no accessible authenticator — the UI fails exactly the way it should
  ("Couldn't set up a passkey," not a hang or a crash). The biometric step
  itself needs a real browser session on a real device; that part was
  handed off rather than faked.

**What a production version would need that this doesn't have:**

- The rate limiter is in-memory (`lib/rate-limit.ts`) — correct for one
  instance, wrong for multiple. A real deployment needs a shared store
  (Redis/Upstash) and probably a sliding window instead of fixed, since
  fixed windows let a burst straddle the boundary and briefly double the
  effective rate.
- No real SMS provider wired up (Twilio/Vonage/Sinch, per the recon's guess
  at krisenchat's own stack) — intentional for this project, not something
  to gloss over as "basically done."
- Orphaned anonymous `QueueEntry` rows: when a returning visitor resumes an
  older Session from a new browser, the *fresh* anonymous Session created by
  that new browser's "start chat" is left behind, still `WAITING`, now
  disconnected from anyone. Harmless for a demo; a production version would
  want a cleanup job or a check to avoid ever creating that orphan in the
  first place.

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
- "How does passkey sign-in know who you are before you've told it
  anything?" — it doesn't need to. `residentKey: "required"` at
  registration plus no `allowCredentials` at sign-in makes the credential
  itself discoverable; the OS's passkey picker *is* the username field.
  Identity resolution happens server-side afterward, from which credential
  came back — not from any state the requesting browser already had.
