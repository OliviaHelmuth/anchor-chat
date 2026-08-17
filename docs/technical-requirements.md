# Technical requirements — Anchor Chat

## Stack (fixed — matches the job posting's stated stack)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js, App Router | Exact match to krisenchat's stated + observed stack |
| Language | TypeScript, strict mode | Job posting; also required for Prisma type-safety end to end |
| Styling | Tailwind CSS | Job posting |
| Backend | Next.js Route Handlers, one small standalone Node/Express service for the realtime worker | Job posting says "Node.js or Python" — Node keeps one language across the stack, defensible either way |
| ORM / DB | Prisma + Postgres | TypeScript-native, matches the stack we inferred for krisenchat itself |
| Auth | Auth.js (NextAuth.js), credentials providers only (magic link, OTP) | Mirrors krisenchat's confirmed no-password design |
| Realtime | Ably (free tier) — see `docs/hosting-and-scaling.md` for why not a self-hosted socket server by default | Vercel functions can't hold long-lived connections |
| AI | Provider-agnostic client behind a single `classifyUrgency()` function; default to a free-tier or local model (see hosting doc) | Keeps the privacy-relevant logic (redaction) independent of which model vendor is behind it |
| Error tracking | Sentry free tier | Matches observed krisenchat stack |

Do not introduce a second framework, a second database, or a second styling
system without updating this file first — the point of the exercise is depth
in one stack, not breadth.

## Non-functional requirements

### Performance

- Message round-trip (send → appears on the other client): **< 1s** on the
  free-tier realtime service, measured locally, not just "feels fast."
- Initial page load (landing → interactive chat entry): **< 2s** on a cold
  Vercel serverless function, accepting that free-tier cold starts exist.
- Queue-position updates: reflected within **2s** of the underlying change.

### Privacy & data handling

This is the load-bearing non-functional requirement, per the job posting's
own emphasis on "responsible implementation concerning user privacy and
security." Concretely:

- No message content is sent to a third-party model provider with directly
  identifying fields attached (email, phone, session token, IP). Strip these
  before constructing any prompt — see `docs/challenges/ai-triage.md`.
- Anonymous by default: a visitor is usable end-to-end (minus session resume)
  without providing an email or phone number at all.
- All **visitor/chat-side** demo/seed data is synthetic. No real names, no
  real phone numbers, no real crisis content — write clearly fictional seed
  messages. This is unaffected by the carve-out below.
- **Narrow, explicit exception (Milestone 3.5):** the Listener
  application/profile subsystem (FR-8, FR-9) collects real data from real
  people — name, real email, an application message, and peer reviews
  authored by real approved Listeners. This is a deliberate departure from
  "no real user data, ever" for that subsystem only, made because the admin
  (Menty B) is personally vetting real applicants. Consequences to hold to:
  - Applicant/Listener data lives in its own tables, never joined to visitor
    `Session`/`Message` data in a way that could conflate the two.
  - Every applicant-facing surface (application form, public profile) states
    plainly this is a portfolio/practice project, same disclaimer pattern as
    the footer's "practice project, not a real support service" line.
  - No real visitor crisis conversations happen on this deployment — the
    "Listener" role exists to demonstrate the vetting/queue/chat mechanics,
    not to actually broker real support. If that line ever gets blurry in
    practice, stop and treat it as a new, separate decision — it is not
    covered by this carve-out.
- If this were a real service handling EU minors' data, it would be
  processing special-category data under GDPR Art. 9, which would mandate EU
  data residency for storage and processing. This demo doesn't handle real
  data, so it isn't bound by that — but the hosting doc still treats region
  choice as a first-class decision, because it's exactly the kind of thing an
  interviewer may probe ("where would this data actually live, and why?").

### Security

- Session tokens are httpOnly, secure, SameSite=Lax cookies (Auth.js default
  — don't override it).
- Rate-limit the OTP-request and magic-link-request endpoints (a free-tier
  target for abuse otherwise) — a fixed-window limiter is enough for the
  demo; note in `docs/challenges/passwordless-auth.md` what a production
  version would need instead.
- Listener role (and the separate `isAdmin` flag) is enforced server-side on
  every route handler that touches the queue, another user's messages, or
  admin-only actions (application review, removal) — never trust a
  client-sent role.

### Reliability

- Realtime disconnect handling is required (FR-5.3) — silent message loss on
  a flaky connection is not acceptable even in a demo, because it's exactly
  the kind of edge case a technical challenge will probe.
- AI classification failure must not block message delivery (FR-6.3) — the
  triage feature is additive, never a gate on core chat function.

## API surface (overview)

Route handlers under `app/api/`:

- `POST /api/chat/start` — creates an anonymous session + queue entry.
- `POST /api/auth/*` — Auth.js-managed (magic link, OTP).
- `GET /api/queue` — Listener-only, live queue snapshot (backed by realtime
  subscription client-side, this is just the initial fetch).
- `POST /api/queue/:id/claim` — Listener claims a chat.
- `POST /api/chat/:id/messages` — send a message; triggers the AI
  classification pipeline server-side before broadcasting.
- `POST /api/listener-applications` — public, creates a `LISTENER_APPLICATION`
  row and emails the admin.
- `POST /api/listener-applications/:id/approve` / `/reject` — admin-only.
- `POST /api/listeners/:id/reviews` — Listener-only (author must be
  `status=approved`), creates a `LISTENER_REVIEW` row.
- Realtime channel per chat (`chat:{id}`) for message broadcast; a separate
  `queue` channel for queue-state updates.

Full request/response shapes belong in code (types are the contract), not
duplicated here — this section is for shape of the surface, not the schema
itself.

## Integration requirements

| Integration | Free tier used | Constraint to design around |
|---|---|---|
| Email (magic link) | Resend | 100/day, 3,000/month — plenty for a demo, note the ceiling |
| SMS (OTP) | Skip real SMS; log OTP to server console in dev | No free ongoing SMS tier exists — document this trade-off rather than pretending otherwise |
| Realtime | Ably | 200 concurrent connections, 6M msgs/month — see hosting doc for what happens past that |
| AI | Groq or Gemini free tier, or local Ollama | See hosting doc for the trade-offs between them |
| Error tracking | Sentry | 5k events/month |

## Testing expectations

- Unit tests around the urgency-classification redaction logic specifically
  (this is the part most worth proving works, not just believing it does).
- One end-to-end test covering the full MVP slice (start chat → sign in →
  Listener claims → message round-trip) using Playwright.
- No requirement for exhaustive coverage elsewhere — this is a demo, not
  production software; spend testing effort where the PRD says the risk is.
