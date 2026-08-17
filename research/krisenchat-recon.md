# krisenchat.de recon

**Date:** 2026-08-17 · **Method:** unauthenticated HTTP requests to public
URLs, response headers, and public JS bundles. No account created, no auth
bypassed, no private data accessed. Frozen findings — don't edit this file to
match reality later; add a dated addendum instead if you re-check.

Legend: **confirmed** = seen directly in headers/network/bundle. **job
posting** = stated by krisenchat in the Personio listing. **inferred** =
educated guess, not verified — don't repeat as fact in an interview.

## Frontend & hosting

| Layer | Finding | Confidence |
|---|---|---|
| Framework | Next.js 14+, App Router, RSC (route files literally named `app/[locale]/page.js`, `app/layout.js`) | confirmed |
| Language | TypeScript | job posting |
| Styling | Tailwind CSS | job posting |
| i18n | Locale-prefixed routing (`/de/…`) via App Router segment, likely `next-intl` | confirmed |
| Hosting | Vercel — `server: Vercel` header, ISR with 300s stale time, edge cache HIT in `fra1`, origin function in `iad1` | confirmed |
| CMS | Contentful — marketing images served from `images.ctfassets.net` via `next/image` | confirmed |
| Analytics | Vercel Analytics, proxied through a randomized first-party path (e.g. `/119e43dd156d5cde/script.js`) rather than `/_vercel/insights/` directly — a deliberate ad-blocker-evasion pattern | confirmed |
| Error tracking | Sentry — string fingerprint in the chat app's JS bundle | confirmed |

## Authentication — the standout finding

`chat.krisenchat.de/api/auth/providers` is a standard, unauthenticated
Auth.js (NextAuth.js) route, and it returns the full provider config:

```json
{
  "otp-sms-auth": { "name": "Phone", "type": "credentials" },
  "passkeys":     { "name": "Passkeys", "type": "credentials" },
  "magic-link":   { "name": "Magic Link", "type": "credentials" }
}
```

**No password provider at all.** `/api/auth/session`, `/api/auth/signin/*`,
`/api/auth/callback/*` all match standard Auth.js route conventions —
confirmed, not inferred. This is a deliberate product decision (low-friction,
anonymous-feeling entry for a crisis service aimed at under-25s), and it's
the basis for `docs/challenges/passwordless-auth.md`.

## Backend & AI (stated directly in the job posting)

- Frontend core: "Next.JS, React, Typescript, Tailwind" — their words.
- Backend/API: "Node.js **or** Python" — phrased as an either/or.
- AI: called out twice, both times qualified by privacy — "integrate and
  leverage AI models and features... with a strong focus on responsible
  implementation concerning user privacy and security." This is the
  headline theme of the role, not a footnote.
- Ownership: "from conceptualization through to production deployment **and
  monitoring**" — they expect reasoning about observability, not just code.

## What we couldn't see (inferred only)

- **Realtime message delivery** — no WebSocket/Ably/Pusher/socket.io
  signature found in the *public* bundles; that code is presumably behind
  login in the counselor/chat-room views we can't reach. Given Vercel
  serverless functions can't hold long-lived connections, some managed
  pub/sub (Ably/Pusher) or a separate always-on service is the likely shape
  — not confirmed.
- **Database** — not observable. Postgres via Prisma is the stack-consistent
  guess over MongoDB, given the all-TypeScript frontend and Vercel hosting.
- **WhatsApp channel** — the *feature* is confirmed (site copy explicitly
  offers "unseren eigenen Chat oder WhatsApp" as two entry points into the
  same queue); the vendor isn't. 360dialog (a German WhatsApp Business
  Solution Provider) or Twilio are plausible guesses.
- **OTP/SMS & passkey implementation** — Auth.js's credentials provider is a
  thin shim; the actual OTP send and WebAuthn ceremony are custom backend
  code. Likely an SMS API (Twilio/Vonage/Sinch) and something like
  `@simplewebauthn/server` or Auth.js's experimental WebAuthn adapter.

## Product mechanics (from site copy)

1. User starts a chat (own widget or WhatsApp) with no account required
   up front.
2. Immediate automated wait-time estimate — implies a live queue with
   position/throughput tracking, not a static message.
3. A human counselor picks up and the conversation continues as a normal
   chat thread.

Other constraints in the FAQ copy: strict **under-25** age gate, an explicit
anonymity promise, and a direct FAQ answer about police escalation ("Ruft
ihr die Polizei?") — implying a defined escalation/safety-override path.

## The line that matters

Everything in this file is about a real nonprofit's real product, gathered
from public pages while researching for a job application. It's reference
material for understanding the domain and stack — not a source to copy
branding, copy, or product logic from. See `CLAUDE.md` for how the rest of
this repo (Anchor Chat) stays a distinct, originally-branded project.
