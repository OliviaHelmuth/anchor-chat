# Tasks — Anchor Chat

Live backlog. Work top to bottom within a milestone unless a task is blocked.
Every task is sized to finish in under ~2 hours; if one doesn't fit that,
split it before starting (see `docs/workflow.md`). Task IDs are stable —
don't renumber when reordering, just move the row.

Legend: `[FR-x.x]` = requirement it satisfies (`docs/product-requirements.md`).
`[Challenge N]` = the interview-practice topic it maps to.

## Milestone 0 — Repo & infra bootstrap

- [x] T0.1 — `npx create-next-app` with TypeScript + Tailwind + App Router
- [x] T0.2 — Provision Neon Postgres (EU/Frankfurt project), add `DATABASE_URL` to `.env` and Vercel env vars (Production + Preview) — project "Krisenchat reverse engineered", `eu-central-1`
- [x] T0.3 — Add Prisma, write the initial schema from `docs/architecture.md`'s ER diagram (`prisma/schema.prisma`), migration `20260817143232_init` applied
- [x] T0.4 — Provision Ably free app, add key to env vars (local `.env` + Vercel Production/Preview)
- [x] T0.5 — Deploy the empty scaffold to Vercel, confirm a public URL works [FR-7.1] — https://anchor-chat-kappa.vercel.app (200 OK)
- [x] T0.6 — Wire up Sentry free tier for both client and server errors [FR-7.2] — `@sentry/nextjs`, `instrumentation.ts` (server/edge) + `instrumentation-client.ts` (client) + `app/global-error.tsx`, DSN in `.env` and Vercel Production/Preview. Source-map upload not configured (needs a Sentry auth token, not just the DSN) — fine for now, revisit if stack traces in the dashboard turn out unreadably minified
- [x] T0.7 — Push local repo to GitHub — https://github.com/OliviaHelmuth/anchor-chat (public)
- [ ] T0.8 — Connect the GitHub repo to the Vercel project for auto-deploy-on-push — currently failing ("Failed to connect ... Make sure you have access"), likely fallout from the ongoing GitHub outage or Vercel's GitHub App not yet authorized since we signed into Vercel via email; retry once GitHub's incident clears

## Milestone 1 — Anonymous entry & queue [FR-1, FR-3]

- [x] T1.1 — Landing page with a single "start chat" action, no form fields (`app/page.tsx`, `app/_components/StartChat.tsx`)
- [x] T1.2 — `POST /api/chat/start`: create anonymous `Session` + `QueueEntry` rows [FR-1.1, FR-1.2] — idempotent on reload/double-click, sets the `anchor_session` httpOnly cookie
- [x] T1.3 — Queue-position calculation: position = count of `waiting` entries ahead by `joinedAt` [FR-3.1] (`lib/queue.ts`) — verified with a real second concurrent session: correctly landed at #2
- [x] T1.4 — Wait-time estimate: (queue depth) ÷ (rolling avg claims/minute over last N claims), not a hardcoded number [FR-3.2] — cold-start fallback (5 min) verified live since no claims exist yet (Milestone 3 hasn't shipped claiming)
- [x] T1.5 — Subscribe the visitor's client to the `queue` Ably channel so position updates live [FR-3.3] — token-auth endpoint scoped subscribe-only, channel carries no personal data (ping-then-refetch, not broadcast), 20s poll as fallback
- [x] T1.6 — Schema review: confirm no name/DOB/address field exists anywhere [FR-1.3] — `grep -inE "name|dob|birth|address" prisma/schema.prisma` matches only the comment stating the rule, no field

## Milestone 2 — Passwordless auth · Challenge 1 [FR-2]

- [x] T2.1 — Install Auth.js, configure a `magic-link` credentials provider backed by Resend [FR-2.1] — custom Credentials provider (not the built-in Email/Adapter flow — see T2.3), Resend wired with a console-log fallback when `RESEND_API_KEY` is unset
- [x] T2.2 — Magic link token: 15-minute expiry, single-use, invalidate on first successful use [FR-2.2, FR-2.3] — hashed at rest, verified live: replaying a used token is rejected
- [x] T2.3 — On successful magic-link callback, bind the email to the existing anonymous `Session` (don't create a second user) — plus the non-obvious part: if the email already belongs to a *different* Session (returning visitor, new browser), resume that one instead. Verified with two separate cookie jars.
- [x] T2.4 — OTP provider: 6-digit code, 5-minute expiry, 5-attempt lockout, logged to server console instead of real SMS [FR-2.4] — same resume-by-phone logic as email, verified live (wrong code rejected, correct code signs in). **Built and tested, hidden from the UI** — no free SMS-delivery tier exists, so surfacing it would just be a button that quietly fails for a real visitor. Revisit if a paid SMS provider is ever worth it.
- [x] T2.5 — Rate-limit the auth **request** endpoints (`/api/auth/request-magic-link`, `/api/auth/request-otp` — the actual spam vector, not `/api/auth/signin/*` which Auth.js owns) — fixed window, 5 req/min/IP, verified live (429 on the 5th/6th rapid request)
- [x] T2.6 — Write `docs/challenges/passwordless-auth.md` notes on what changed vs. a production version (real SMS, sliding-window limiter, orphaned anonymous QueueEntry on resume)
- [x] T2.7 — Passkey registration + sign-in [FR-2.5] — promoted from stretch: zero-cost at any scale, and it's one of krisenchat's real three methods. Custom `@simplewebauthn/server`-backed Credentials provider (not Auth.js's built-in WebAuthn, which requires a full Adapter — same reasoning as T2.1/T2.3). Usernameless/discoverable-credential flow, verified live: well-formed options, expired-challenge rejection, and graceful failure in an environment with no platform authenticator. The actual Touch ID/security-key ceremony needs a real device — handed off, not faked; see `docs/challenges/passwordless-auth.md`.

## Milestone 2.5 — Real landing page & rebrand pass

Inserted out of sequence, before Milestone 3 — the app needed to actually
*look* like a real product before going further, not just function like one.
Design language pulled from an external reference (fundwise.fun: warm cream
ground, chunky condensed display type, one punchy accent, pill-everything,
sticker badges) and adapted into Anchor Chat's own palette/voice, not copied.

- [x] T2.5.1 — Design tokens: cream/coffee/amber/sage palette (`app/globals.css`), Archivo Black display + Plus Jakarta Sans body via `next/font/google` (`app/layout.tsx`)
- [x] T2.5.2 — Nav, Footer, CookieBanner components — footer carries Impressum/Datenschutz links + an explicit "practice project, not a real support service" disclaimer linking the public repo
- [x] T2.5.3 — Hero, "if this is you" pain-point grid, how-it-works, trust section — meme-literate hook ("LIFE AIN'T LIVING RN.", the espresso/depresso sticker badge) that deliberately pivots into sincere, non-clinical copy once past the hook; trust built via honest fact-chips (anonymity, real counselors, free, open-source), not fabricated testimonials — see note below
- [x] T2.5.4 — Impressum + Datenschutz pages — both explicitly labeled as a demo structure (no real registered entity, no invented address/registration number), matching the German-site convention seen in `research/krisenchat-recon.md` without pretending to be a real filing
- [x] T2.5.5 — Restyle `StartChat`/`WaitingRoom`/`BindIdentity` onto the new tokens so the actual working flow doesn't look bolted onto the marketing page
- [x] T2.5.6 — Verified live: full flow (hero → chat now → real queue position) end to end, both legal pages, zero console errors, desktop + narrow viewport

**Why no testimonials:** fabricated user quotes/reviews for a mental-health-adjacent product — even clearly fictional ones — read as presenting invented experiences as genuine, which is the wrong kind of "trust" to fake. Trust here comes from process transparency (open-source, what's collected, who answers) instead.

## Milestone 3 — Counselor queue view [FR-4]

- [ ] T3.1 — Seed one counselor account directly in the DB (no self-serve counselor signup)
- [ ] T3.2 — Role check middleware: counselor-only routes reject a visitor session server-side [security, technical-requirements.md]
- [ ] T3.3 — Counselor queue page subscribed to the `queue` Ably channel, live list [FR-4.2]
- [ ] T3.4 — `POST /api/queue/:id/claim`: assign counselor, flip status, broadcast removal [FR-4.3]

## Milestone 4 — Realtime messaging · Challenge 2 [FR-5]

- [ ] T4.1 — `POST /api/chat/:id/messages`: write to DB with server-assigned sequence, then publish on `chat:{id}` [FR-5.1, FR-5.2]
- [ ] T4.2 — Chat UI: message list + composer, subscribed to `chat:{id}`
- [ ] T4.3 — Reconnect handling: on Ably reconnect, re-fetch messages since last known sequence [FR-5.3]
- [ ] T4.4 — Manual test: two browser tabs (visitor + counselor), confirm ordering holds under rapid concurrent sends
- [ ] T4.5 — *(stretch)* typing indicator [FR-5.4]

## Milestone 5 — AI-assisted triage · Challenge 3 [FR-6]

- [ ] T5.1 — Pick model provider (Groq or Gemini free tier, or local Ollama) per `docs/hosting-and-scaling.md`, get it behind one `classifyUrgency(text)` function
- [ ] T5.2 — Redaction step: strip email/phone/session token/IP before building the prompt — write this as its own tested unit, not inline [FR-6.2]
- [ ] T5.3 — Unit tests for the redaction step specifically (this is the part that most needs proving) [technical-requirements.md testing]
- [ ] T5.4 — Wire classification into the message-send path; on failure, tag `unclassified` and still deliver [FR-6.3]
- [ ] T5.5 — Show the tier only in the counselor view, never to the visitor [FR-6.4]
- [ ] T5.6 — Write `docs/challenges/ai-triage.md`: exact fields stripped, and what you'd tell an interviewer about the trade-offs

## Milestone 6 — Queue design exercise · Challenge 4

- [ ] T6.1 — Write up the wait-time-estimate algorithm from T1.4 as a standalone doc with the formula and its failure modes (empty history, sudden counselor drop-off)
- [ ] T6.2 — Whiteboard-style writeup: how you'd fairly route an incoming chat across multiple available counselors (round robin vs. least-loaded vs. skill match) — no code required, `docs/challenges/queue-design.md`

## Milestone 7 — Node vs Python API exercise · Challenge 5

- [ ] T7.1 — Re-implement `POST /api/chat/:id/messages` as a standalone Python (FastAPI) service hitting the same Postgres schema, purely for comparison
- [ ] T7.2 — Write `docs/challenges/node-vs-python.md`: side-by-side trade-offs you actually hit (typing story, async model, deployment story on a free tier)

## Milestone 8 — Code review practice · Challenge 6

- [ ] T8.1 — Pick one finished milestone's code, write a self-review as if reviewing a teammate's PR — what you'd flag, in `docs/challenges/code-review-practice.md`
- [ ] T8.2 — *(optional)* trade a real review with someone else on a snippet from this repo

## Milestone 9 — Demo readiness

- [ ] T9.1 — Seed script: synthetic visitor + counselor + a short fictional conversation, runnable from a clean clone [FR-7.3]
- [ ] T9.2 — README "getting started" verified against a genuinely fresh checkout
- [ ] T9.3 — Time a live demo run end to end, confirm it's under 5 minutes (PRD success criterion)
- [ ] T9.4 — Re-read `docs/hosting-and-scaling.md` and make sure you can explain every choice out loud without notes
