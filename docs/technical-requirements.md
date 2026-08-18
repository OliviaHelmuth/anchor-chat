# Technical requirements — overshare.io

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

**i18n (DE/EN toggle, FR-10.1):** a custom React Context + dictionary lookup
(`lib/i18n.tsx`), not `next-intl`/locale-prefixed routing. Originally scoped
to just the public landing page (nav, hero, how-it's-used, trust, FAQ,
footer, cookie banner); extended to the Listener/admin panel (`AdminNav`,
the 4 `/listener` + `/admin` pages, `AdminDashboard`, `ApplicationsReview`,
`AdminListenersPanel`, `ProfileEditForm`, `ListenerChat`) on direct request.
The visitor-facing `ChatWidget`/`BindIdentity` (landing page's own chat
widget) are still English-only — not part of either request. Reasoning for
Context over locale-prefixed routing still holds: `app/[locale]/...` would
touch every route including auth callbacks and Ably token routes; a Context
provider is zero new dependencies and confined to components that actually
need it.

**Theme toggle (FR-10.2):** `data-theme="light"|"dark"` attribute on
`<html>`, set via an inline blocking script in `app/layout.tsx` (avoids a
flash of the wrong theme) and toggled client-side into `localStorage`. CSS
tokens in `app/globals.css` define light as the bare `:root` default, dark
under both `@media (prefers-color-scheme: dark)` (guarded to not fire when
`data-theme="light"` is explicitly set) and `:root[data-theme="dark"]` (so
the explicit toggle wins over OS preference in both directions).

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
| Email (magic link) | Brevo | 300/day — plenty for a demo; sender address must be verified in Brevo's dashboard first |
| SMS (OTP) | Skip real SMS; log OTP to server console in dev | No free ongoing SMS tier exists — document this trade-off rather than pretending otherwise |
| Realtime | Ably | 200 concurrent connections, 6M msgs/month — see hosting doc for what happens past that |
| AI | Groq or Gemini free tier, or local Ollama | See hosting doc for the trade-offs between them |
| Error tracking | Sentry | 5k events/month |

## Local development setup

Neon is the deployed default (`docs/hosting-and-scaling.md`), but
`DATABASE_URL` is interchangeable — Prisma doesn't care whether it's talking
to Neon or a local Postgres, same schema and migrations either way. Local
Postgres is a documented, working alternative for day-to-day dev, useful for
working offline or without provisioning a cloud DB account (relevant to
`tasks/TASKS.md`'s T10.2, which needs the app runnable from a genuinely
fresh clone):

- Install Postgres locally (e.g. `brew install postgresql@14`), start it
  (`brew services start postgresql@14`), then `createdb overshare_dev`.
- Point `DATABASE_URL` in your local `.env` at it:
  `postgresql://<user>@localhost:5432/overshare_dev`.
- `npx prisma migrate deploy` (or `npm run db:migrate` for dev-mode
  migrations) + `npm run db:seed` — identical commands to the Neon path.
- Trade-off, same framing as `hosting-and-scaling.md`'s decision tables:
  local Postgres has no cold-start/autosuspend (faster local iteration) but
  isn't reachable from a deployed Vercel preview — Neon (or another cloud
  Postgres) is still required for anything that needs to be online.
- Same pattern the test suite already uses for its own isolated database —
  see Testing expectations below — just a separate database name
  (`overshare_dev` vs. `overshare_test`) on the same local cluster, never
  shared with each other or with the real Neon deployment.

Scope note: this only covers the database. Ably has no meaningful local
substitute without a real architecture swap (see
`docs/hosting-and-scaling.md`'s realtime section); Brevo/OTP already fall
back to logging locally with no external account needed (`lib/email.ts`);
Sentry and the AI providers (Groq/Gemini/Ollama) are unaffected either way.

## Testing expectations

Tooling: **Vitest** (unit + component + integration) and **Playwright**
(E2E), wired into a GitHub Actions CI workflow. No mocking of the app's own
DB or external services in integration/E2E tests — same "real dev server,
real Postgres, real Ably" convention already used for every milestone's
manual verification, just automated. Auth in tests never needs a real inbox:
`lib/email.ts` already falls back to `console.log`-ing the magic-link/
Listener-login URL whenever `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` are unset
(the same fallback local dev and CI both use), so tests scrape that instead.

- Unit tests around the urgency-classification redaction logic specifically
  (this is the part most worth proving works, not just believing it does) —
  Milestone 6.
- Unit test for `lib/rate-limit.ts` (the fixed-window limiter protecting the
  OTP/magic-link request endpoints, called out under Security below).
- **Milestone 9.6 (superseding the "no exhaustive coverage" line this
  section originally had)**: revisited once the interview-prep value of a
  thorough suite outweighed the demo-scope default. Every API route gets an
  integration test (happy path + auth-rejection); every `lib/` function
  that's testable without mocking Prisma or a browser API jsdom lacks
  (Canvas, Web Audio) gets a unit test; components are scoped to the ~12
  with real logic (forms, `AdminDashboard`, `ListenerChat`, toggles) —
  pure-markup marketing sections (`Hero`, `PainPoints`, `FAQSection`, etc.)
  are still deliberately skipped, not an oversight. E2E stays at the one MVP
  flow below — broad unit/integration coverage underneath it, not a wide
  top of the pyramid.
- Component tests (React Testing Library): `ChatWidget` (core visitor flow),
  `ApplyForm` (the one form that collects real applicant data — see the
  carve-out above), plus the rest of the logic-bearing components per
  Milestone 9.6.
- Integration tests against a real test Postgres DB, no mocks, covering
  every route under `app/api/` — e.g. queue claim
  (`POST /api/queue/:id/claim`, atomic/409-on-race), message send
  (`POST /api/chat/:id/messages`, correct sequence ordering), and outward
  from there per Milestone 9.6's breakdown. Two honesty notes that still
  apply even at "thorough": the passkey `register-verify` route's tests
  cover rejection paths only (malformed response, expired/wrong challenge)
  — a real WebAuthn ceremony needs a real authenticator, same limitation
  Milestone 2's T2.7 already documented live, not newly faked here; and the
  `applications` route's tests use the same synthetic
  `test-applicant@example.com`-style fixture Milestone 3.5's manual
  verification already established, cleaned up after — never real applicant
  data, per this file's carve-out conditions above.
- One end-to-end test covering the full MVP slice (start chat → Listener
  signs in and claims → message round-trip both ways) using Playwright. The
  visitor stays anonymous throughout: `BindIdentity` (the visitor's own
  magic-link sign-in block) has been unmounted from `ChatWidget` since
  Milestone 4.98, so there's no visitor-facing sign-in step actually
  reachable in the current UI — only the Listener's. Deliberately staying
  at one flow — E2E is the expensive layer, and the integration tests above
  cover the other user journeys (applications, moderation) faster and just
  as meaningfully at the API level.
