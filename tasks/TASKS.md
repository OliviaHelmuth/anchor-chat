# Tasks — Anchor Chat

Live backlog. Work top to bottom within a milestone unless a task is blocked.
Every task is sized to finish in under ~2 hours; if one doesn't fit that,
split it before starting (see `docs/workflow.md`). Task IDs are stable —
don't renumber when reordering, just move the row.

Legend: `[FR-x.x]` = requirement it satisfies (`docs/product-requirements.md`).
`[Challenge N]` = the interview-practice topic it maps to.

## Milestone 0 — Repo & infra bootstrap

- [x] T0.1 — `npx create-next-app` with TypeScript + Tailwind + App Router (pushing to GitHub is a separate step below, pending a go/no-go on repo name + visibility)
- [ ] T0.2 — Provision Neon Postgres (EU/Frankfurt project), add `DATABASE_URL` to `.env.local` and Vercel env vars — **needs you**, account creation
- [x] T0.3 — Add Prisma, write the initial schema from `docs/architecture.md`'s ER diagram (`prisma/schema.prisma`, validated) — migration itself blocked on T0.2
- [ ] T0.4 — Provision Ably free app, add key to env vars — **needs you**, account creation
- [ ] T0.5 — Deploy the empty scaffold to Vercel, confirm a public URL works [FR-7.1] — **needs you**, account creation
- [ ] T0.6 — Wire up Sentry free tier for both client and server errors [FR-7.2] — **needs you**, account creation
- [x] T0.7 — Push local repo to GitHub — https://github.com/OliviaHelmuth/anchor-chat (public)

## Milestone 1 — Anonymous entry & queue [FR-1, FR-3]

- [ ] T1.1 — Landing page with a single "start chat" action, no form fields
- [ ] T1.2 — `POST /api/chat/start`: create anonymous `Session` + `QueueEntry` rows [FR-1.1, FR-1.2]
- [ ] T1.3 — Queue-position calculation: position = count of `waiting` entries ahead by `joinedAt` [FR-3.1]
- [ ] T1.4 — Wait-time estimate: (queue depth) ÷ (rolling avg claims/minute over last N claims), not a hardcoded number [FR-3.2]
- [ ] T1.5 — Subscribe the visitor's client to the `queue` Ably channel so position updates live [FR-3.3]
- [ ] T1.6 — Schema review: confirm no name/DOB/address field exists anywhere [FR-1.3]

## Milestone 2 — Passwordless auth · Challenge 1 [FR-2]

- [ ] T2.1 — Install Auth.js, configure a `magic-link` credentials provider backed by Resend [FR-2.1]
- [ ] T2.2 — Magic link token: 15-minute expiry, single-use, invalidate on first successful use [FR-2.2, FR-2.3]
- [ ] T2.3 — On successful magic-link callback, bind the email to the existing anonymous `Session` (don't create a second user)
- [ ] T2.4 — OTP provider: 6-digit code, 5-minute expiry, 5-attempt lockout, logged to server console instead of real SMS [FR-2.4]
- [ ] T2.5 — Rate-limit `POST /api/auth/signin/*` (fixed window, e.g. 5 req/min/IP)
- [ ] T2.6 — Write `docs/challenges/passwordless-auth.md` notes on what changed vs. a production version (real SMS, sliding-window limiter)
- [ ] T2.7 — *(stretch)* Passkey registration + sign-in via Auth.js WebAuthn [FR-2.5]

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
