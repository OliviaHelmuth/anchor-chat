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
- [x] T0.9 — Local Postgres as a documented, working alternative to Neon for
  day-to-day dev — `docs/technical-requirements.md`'s new "Local development
  setup" section (placed just before Testing expectations, same house rule
  of doc-before-task). `overshare_dev` provisioned on the same local
  Homebrew `postgresql@14` cluster the test suite (Milestone 9.5) already
  uses for `overshare_test` — separate database, same cluster, never shared
  with each other or with the real Neon deployment. All 8 migrations
  applied, seeded with the real admin Listener identity (same
  `LISTENER_ADMIN_EMAIL` as the Neon DB, per the carve-out in this file's
  own Privacy & data handling section). Verified live: started a throwaway
  `next start` instance on a scratch port against `overshare_dev` (reusing
  the existing `.next` production build — read-only, doesn't touch or
  rebuild it, so the live `next dev` session on port 3000 was undisturbed
  throughout), confirmed the homepage loads and `POST /api/chat/start`
  actually writes a row into `overshare_dev` specifically (not Neon or the
  separate test DB), then cleaned up that throwaway session row, leaving
  just the seeded admin Listener. The real `.env` (still pointed at Neon)
  was never touched — this is an additional, opt-in local option, not a
  switch-over.

## Milestone 1 — Anonymous entry & queue [FR-1, FR-3]

- [x] T1.1 — Landing page with a single "start chat" action, no form fields (`app/page.tsx`, `app/_components/StartChat.tsx`)
- [x] T1.2 — `POST /api/chat/start`: create anonymous `Session` + `QueueEntry` rows [FR-1.1, FR-1.2] — idempotent on reload/double-click, sets the `anchor_session` httpOnly cookie
- [x] T1.3 — Queue-position calculation: position = count of `waiting` entries ahead by `joinedAt` [FR-3.1] (`lib/queue.ts`) — verified with a real second concurrent session: correctly landed at #2
- [x] T1.4 — Wait-time estimate: (queue depth) ÷ (rolling avg claims/minute over last N claims), not a hardcoded number [FR-3.2] — cold-start fallback (5 min) verified live since no claims exist yet (Milestone 3 hasn't shipped claiming)
- [x] T1.5 — Subscribe the visitor's client to the `queue` Ably channel so position updates live [FR-3.3] — token-auth endpoint scoped subscribe-only, channel carries no personal data (ping-then-refetch, not broadcast), 20s poll as fallback
- [x] T1.6 — Schema review: confirm no name/DOB/address field exists anywhere [FR-1.3] — `grep -inE "name|dob|birth|address" prisma/schema.prisma` matches only the comment stating the rule, no field
- [x] T1.7 — Visitor can leave the queue: cancel action removes the `QueueEntry`, closes the chat widget, returns to the landing page [FR-3.4] — `POST /api/chat/leave` (`lib/queue.ts`'s `leaveQueue`, `deleteMany` for idempotency on a double-click), "Leave the queue" link in the widget, publishes the same `queue` Ably update `start` uses. Verified live: leaving returns to the hero landing page, a second leave call is a no-op (200, not 500), starting again after leaving creates a fresh queue entry.

**UX fine-tuning pass (post-Milestone 3.5):** the full-page `WaitingRoom` was
replaced with `ChatWidget` — a fixed bottom-right panel (open/minimize,
persists across the site instead of taking over the page), floated via a
small `ChatWidgetContext` so `StartChat` (Hero's CTA) and the widget can
coordinate open state without being parent/child. This is FR-5.5's widget
*shape*, pulled forward from Milestone 4 because it fixed a real bug: the
Nav logo's link to "/" appeared broken while queued, since Home() used to
swap its entire body to `WaitingRoom` regardless of which link got you back
to "/" — now the landing page always renders and the widget floats
independently, so the logo genuinely returns to it. Also: when position is
1, the widget shows "You're connected — a Listener will be with you any
moment" instead of the raw `#1`, since there's nothing left to literally
wait for. Note this is still a shell, not Milestone 4's actual chat — the
composer is present but disabled ("Messaging opens once a Listener
joins…"); T4.1/T4.2's real message list, composer, and `chat:{id}`
subscription are still outstanding, along with T4.2.1's display-name field
and T4.2.2's queue-roster panel (FR-5.5/5.6 aren't fully met yet). Nav's
top-right CTA also changed from "Chat now" to "Login" → `/listener/login`,
since starting a chat now lives entirely in the Hero CTA + widget, freeing
the Nav slot for Listener/admin sign-in (including Menty B reaching the
admin dashboard).

## Milestone 2 — Passwordless auth · Challenge 1 [FR-2]

- [x] T2.1 — Install Auth.js, configure a `magic-link` credentials provider backed by Resend [FR-2.1] — custom Credentials provider (not the built-in Email/Adapter flow — see T2.3), Resend wired with a console-log fallback when `RESEND_API_KEY` is unset
- [x] T2.2 — Magic link token: 15-minute expiry, single-use, invalidate on first successful use [FR-2.2, FR-2.3] — hashed at rest, verified live: replaying a used token is rejected
- [x] T2.3 — On successful magic-link callback, bind the email to the existing anonymous `Session` (don't create a second user) — plus the non-obvious part: if the email already belongs to a *different* Session (returning visitor, new browser), resume that one instead. Verified with two separate cookie jars.
- [x] T2.4 — OTP provider: 6-digit code, 5-minute expiry, 5-attempt lockout, logged to server console instead of real SMS [FR-2.4] — same resume-by-phone logic as email, verified live (wrong code rejected, correct code signs in). **Built and tested, hidden from the UI** — no free SMS-delivery tier exists, so surfacing it would just be a button that quietly fails for a real visitor. Revisit if a paid SMS provider is ever worth it.
- [x] T2.5 — Rate-limit the auth **request** endpoints (`/api/auth/request-magic-link`, `/api/auth/request-otp` — the actual spam vector, not `/api/auth/signin/*` which Auth.js owns) — fixed window, 5 req/min/IP, verified live (429 on the 5th/6th rapid request)
- [x] T2.6 — Write `docs/challenges/passwordless-auth.md` notes on what changed vs. a production version (real SMS, sliding-window limiter, orphaned anonymous QueueEntry on resume)
- [x] T2.7 — Passkey registration + sign-in [FR-2.5] — promoted from stretch: zero-cost at any scale, and it's one of krisenchat's real three methods. Custom `@simplewebauthn/server`-backed Credentials provider (not Auth.js's built-in WebAuthn, which requires a full Adapter — same reasoning as T2.1/T2.3). Usernameless/discoverable-credential flow, verified live: well-formed options, expired-challenge rejection, and graceful failure in an environment with no platform authenticator. The actual Touch ID/security-key ceremony needs a real device — handed off, not faked; see `docs/challenges/passwordless-auth.md`.

**Post-Milestone 2 provider swap:** Resend replaced with Brevo for magic-link
email — Resend's `RESEND_API_KEY` in this environment was never populated
with a real key (empty string), so magic links were only ever console-logged
here, never actually delivered. Brevo's free tier is more generous (300/day
vs. Resend's 100/day) and the swap was a single-file change (`lib/email.ts`
now calls Brevo's REST API directly via `fetch`, no SDK dependency — the
`resend` package was removed from `package.json`). Same
config-change-not-rewrite shape as before: no `BREVO_API_KEY`/
`BREVO_SENDER_EMAIL` still means console-log fallback, same as T2.1 always
worked. `BREVO_SENDER_EMAIL` must be a sender verified in Brevo's dashboard
first — unlike Resend, there's no shared sandbox sender address.

- [x] T2.8 — Filed against a real bug report: magic-link email worked on localhost but silently did nothing in production. Root-caused via `vercel env ls production` — `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` were never added to the Vercel project's env vars (only `LISTENER_ADMIN_EMAIL`, `AUTH_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `ABLY_API_KEY`, `DATABASE_URL` are set there), so `lib/email.ts`'s `sendEmail` silently returned `false` — the same fallback T2.1/the Brevo swap intentionally use for local dev. Nothing about that path throws, so none of the `Sentry.captureException` calls already sitting in every request-magic-link/request-listener-login/request-otp route ever fired, and the route still answered the client with 200 `{ ok: true }` — indistinguishable from a real send. Two things fixed in code: (1) `lib/email.ts` now calls `Sentry.captureMessage(..., "error")` when Brevo config is missing **and** `NODE_ENV === "production"` — the identical missing-config state is silent in dev (expected) and now loud in prod (a real misconfiguration), so this exact failure mode shows up in Sentry the next time it happens instead of just looking like a link that never arrived; (2) `/listener/login` — the only email-magic-link entry point actually mounted in production right now (`BindIdentity`'s equivalent flow has been unmounted from `ChatWidget` since Milestone 4.98) — gets a "Didn't get email? Resend email" link that appears 2 minutes after a send/resend and re-POSTs `/api/auth/request-listener-login` with the same address, reusing the existing 5/min rate limit rather than a new endpoint. Infra fixed too, with explicit go-ahead each step (adding to shared production config, then triggering a production deploy, are both things this repo's conventions treat as requiring confirmation first): `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` added to Vercel Production + Preview via `vercel env add` (values piped from local `.env` straight to the CLI, never printed to the transcript), then `vercel --prod` to actually roll the new env vars out — Vercel bundles env vars into a function's build, so adding them alone doesn't affect an already-deployed function. Verified live end to end on the real production URL (`anchor-chat-kappa.vercel.app`, not just dev): submitted the seeded admin address at `/listener/login`, a real email arrived via Brevo, sign-in completed successfully. **Not verified live**: the resend button's 2-minute timer actually firing (not waited out — confirmed by code path and a clean `tsc`/`lint` instead) and the Sentry capture actually landing in the dashboard (only reachable by deploying with Brevo unset again, which isn't worth doing now that it's configured). `BindIdentity.tsx` intentionally left untouched — still unmounted, not part of this bug's live surface.

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

## Milestone 3 — Listener queue view [FR-4]

Role renamed from "counselor" to "Listener" — confirmed safe in
`research/legal-terminology.md` (plain English, not a licensing-scheme title
anywhere checked). "Brain Doc" was considered and rejected by that same
research — retired as a candidate name entirely, human or future AI.

- [x] T3.1 — Seed one Listener account directly in the DB, flagged `isAdmin: true` — this is "Menty B," the admin/main account owner, not a self-serve signup [FR-4.1] — `Counselor` model renamed to `Listener` (+ `isAdmin`, `Session.listenerId`, `MessageSender.LISTENER`), migration `20260817174815_listener_role_and_login`. `prisma/seed.ts` upserts the one admin row from `LISTENER_ADMIN_EMAIL` (real email, not synthetic — see the carve-out in `docs/technical-requirements.md`), wired as `npm run db:seed`; Milestone 9's T9.1 will extend this same file rather than starting a second seed script. Seeded live from `LISTENER_ADMIN_EMAIL`, `isAdmin: true` confirmed.
- [x] T3.2 — Role check middleware: Listener-only routes reject a visitor session server-side; a separate `isAdmin` check gates admin-only routes [FR-4.4, security, technical-requirements.md] — no literal `middleware.ts` (Prisma doesn't run on the edge runtime Next.js middleware uses); `lib/listener-auth.ts`'s `requireListener()`/`requireAdmin()` follow the same in-route-handler convention `getSessionId()` already established. Necessary scaffolding not itemized in the task line: a parallel `listener-login` magic-link Credentials provider (`auth.ts`) + `ListenerLoginToken` model + `POST /api/auth/request-listener-login` + `/listener/login` page, since a Listener is a separate identity from a visitor `Session` and the existing magic-link flow requires an existing visitor Session to bind to. `requireAdmin()` is built and verified by direct call (seeded admin's `isAdmin: true` confirmed live) but has no concrete admin-only route to integration-test against yet — Milestone 3.5's application-approval routes (T3.5.3) will be the first real caller.
- [x] T3.3 — Listener queue page subscribed to the `queue` Ably channel, live list [FR-4.2] — `GET /api/queue`, `app/listener/queue/page.tsx` + `ListenerQueueList` (same push-plus-20s-poll pattern as `WaitingRoom`, T1.5). Verified live: a curl-started visitor session appeared in the Listener's queue view via Ably push (no manual refresh), well under FR-3.3's 2s target.
- [x] T3.4 — `POST /api/queue/:id/claim`: assign Listener, flip status, broadcast removal [FR-4.3] — atomic `updateMany` guard (409 on a race/already-claimed, not a silent overwrite), sets `Session.listenerId`. Verified live: claim removed the entry from the queue view, DB confirmed `status: CLAIMED` + `Session.listenerId` set correctly; re-claiming the same entry returned 409, not 200. Verified unauthenticated and visitor-session requests to `/api/queue` and the claim route both 403.

## Milestone 3.5 — Listener applications, profiles & peer reviews [FR-8, FR-9]

Real data, real applicants — narrow, deliberate exception to "no real user
data," scoped to this subsystem only. See the carve-out in
`docs/technical-requirements.md` and the reasoning in `docs/PRD.md`'s Goals
section before starting. Depends on Milestone 3 (needs the Listener role/
admin flag to exist first).

- [x] T3.5.1 — Public "become a Listener" application form (name, email, message) + `LISTENER_APPLICATION` table [FR-8.1] — `ListenerApplication` model (migration `20260817182209_listener_applications_and_reviews`), `POST /api/applications` (rate-limited 3/hr/IP), `/apply` page + `ApplyForm`. Copy makes no clinical-credential claim ("volunteers, not therapists or counselors").
- [x] T3.5.2 — On submit, email the admin account via Resend [FR-8.2] — `sendApplicationNotificationEmail` (`lib/email.ts`), looked up via `Listener.findFirst({isAdmin:true})` rather than the env var directly, so it keeps working if the admin identity ever changes; best-effort (a failed send doesn't fail the applicant's submission, since the admin view lists it either way). No `RESEND_API_KEY` in this environment yet, so it logs to console — same fallback pattern as T2.1.
- [x] T3.5.3 — Admin-only review view: list pending applications, approve/reject [FR-8.3, FR-8.4] — `GET/POST /api/applications`, `POST /api/applications/:id/approve|reject` (both `requireAdmin`, `updateMany`-guarded against double-decision), `/admin/applications` + `ApplicationsReview`. Approve does *not* copy the applicant's real name into the public `displayName` — FR-9.1 requires no real legal name beyond what the Listener chooses to show, so that field starts blank and the Listener sets it themselves (see T3.5.4's `PATCH /api/listeners/me`, added to make that requirement real rather than aspirational).
- [x] T3.5.4 — Public Listener profile page: display name + bio, no auth required to view [FR-9.1] — `/listeners` (index) + `/listeners/:id`, both public. Necessary scaffolding not itemized in the task line: `PATCH /api/listeners/me` + `/listener/profile` so an approved Listener can self-serve set their own displayName/bio (see T3.5.3's note on why this isn't admin- or application-derived).
- [x] T3.5.5 — Peer review: an approved Listener can leave a review on another Listener's profile; enforce `role=listener, status=approved` server-side, never accept a review from a visitor session [FR-9.2] — `ListenerReview` model, `POST /api/listeners/:id/reviews`. Enforcement is just `requireListener()`: a `Listener` row only ever exists via seed (T3.1) or admin approval (T3.5.3), so successfully resolving one already means "real, vetted peer" — there's no separate approved/pending state on the model itself to check. Self-review blocked (400).
- [x] T3.5.6 — Admin can remove a review or a Listener's listing [FR-9.3] — `DELETE /api/reviews/:id`, `DELETE /api/listeners/:id` (both `requireAdmin`), `/admin/listeners`. Removing a listing blocks self-delete (admin can't lock themselves out) and cascades onto the removed Listener's login tokens + authored/received reviews while `SetNull`-ing any `Session.listenerId` that pointed at them (schema.prisma's `onDelete` clauses).
- [x] T3.5.7 — Seed Menty B's own profile as the first Listener — display name "Menty B" (confirmed safe naming, `research/legal-terminology.md`), write the bio copy — `prisma/seed.ts` upsert now sets `displayName`/`bio` alongside `isAdmin`.

Verified live end to end (dev server + real DB, no mocks): submitted a synthetic test application (`test-applicant@example.com` — not a real applicant, purely to exercise the mechanism) → admin approved it via the UI → new `Listener` row confirmed created with blank profile fields → signed in as that Listener, set displayName "Robin" via the self-serve profile page → posted a peer review on Menty B's public profile, confirmed it rendered with correct attribution → signed back in as admin, removed the review (confirmed gone) → removed Robin's listing via an authenticated in-page `fetch` to `DELETE /api/listeners/:id` (skipped the UI button's native `confirm()` dialog, which browser-automation tooling shouldn't trigger) → confirmed cascade: Robin's `Listener` row and their review both gone, Menty B untouched. Confirmed the self-delete guard (admin can't remove their own listing, 400) and that every gated route 403s unauthenticated (`GET /api/applications`, `POST /api/listeners/:id/reviews`, `DELETE /api/listeners/:id`), while the public profile page still 200s with no auth. Test application/review data cleaned up from the DB afterward. `npx tsc --noEmit` and `npm run build` both clean, all new routes compiled.

Migration note: the same non-interactive-Prisma workaround from T3.1 was needed again, plus an unexpected re-baseline — `_prisma_migrations` had no rows at all this session even though all 5 prior migrations' tables existed (re-resolved all 5 as applied before `migrate deploy` would accept the new one). Root cause not investigated further; flagged here in case it recurs.

## Milestone 4 — Realtime messaging · Challenge 2 [FR-5]

- [x] T4.1 — `POST /api/chat/:id/messages`: write to DB with server-assigned sequence, then publish on `chat:{id}` [FR-5.1, FR-5.2] — split into two role-specific routes rather than one: `app/api/chat/[id]/messages` (visitor, `lib/chat.ts`'s `resolveVisitorChatAccess`) and `app/api/listener/chat/[id]/messages` (Listener, `resolveListenerChatAccess`), sharing `lib/chat-messages.ts` for the actual read/write+publish. Not itemized in the task line, but load-bearing: an earlier single combined check (try Listener identity, fall back to visitor) misattributed a visitor-sent message to the Listener role whenever one browser held both a visitor cookie and a Listener session — the exact dual-role pattern Milestone 3.5's own verification notes already used (admin testing both sides from one browser). Caught live in testing (see below), not by inspection.
- [x] T4.2 — Chat UI as a bottom-right widget (open/collapse), not a full-page takeover; message list + composer, subscribed to `chat:{id}` [FR-5.5] — real message list + working composer added to `ChatWidget` (the shell shipped in Milestone 1). `lib/queue.ts`'s `ChatState` (`none`/`waiting`/`claimed`) replaces the old position-only `/api/chat/position` (now `/api/chat/state`) so the widget can tell "never started" apart from "claimed," and carries `sessionId` on every non-`none` branch — necessary because the widget's `sessionId` used to come from a server-rendered prop frozen at the initial page load, which stayed `null` after `/api/chat/start` created a session client-side (no full reload happens); that gap silently denied the Ably `chat:{id}` subscribe capability until a manual page reload. Also necessary, not itemized: a parallel Listener-side chat surface (`/listener/chat/[id]`, `ListenerChat` component) — FR-5.1 needs somewhere for the Listener to actually read/send, and claiming (`ListenerQueueList`) now navigates there via the sessionId the claim route returns.
- [x] T4.2.1 — Optional display-name field on widget open, defaults to "Anonymous" if left blank; stored on `Session.displayName` [FR-5.5] — migration `20260817184944_session_display_name`, `PATCH /api/chat/display-name`.
- [x] T4.2.2 — Queue roster panel in the widget: shows other waiting visitors by display name/"Anonymous", live off the `queue` channel [FR-5.6] — `GET /api/chat/roster`, reuses `lib/queue.ts`'s `getWaitingQueueEntries` (now carries `displayName`/`sessionId`) and excludes the caller's own entry ("who else," not a mirror).
- [x] T4.3 — Reconnect handling: on Ably reconnect, re-fetch messages since last known sequence [FR-5.3] — both `ChatWidget` and `ListenerChat` track `lastSequenceRef` and re-fetch `?since=` on `connection.on("connected", …)`, skipping the initial connect. Not simulated live (no reliable way to force a socket drop through the browser-automation tooling used here) — verified by code path only, same honesty pattern as the passkey ceremony note in Milestone 2.
- [x] T4.4 — Manual test: two browser tabs (visitor + Listener), confirm ordering holds under rapid concurrent sends — verified live (real dev server + DB, no mocks): visitor started a chat, admin Listener claimed it (`ListenerQueueList` → `router.push` to the new chat page), both sides exchanged messages with correct live delivery, correct left/right attribution on both UIs, and strictly increasing `sequence` in the DB (3, 4) matching send order. Roster verified separately with a second curl-started visitor (`#1 — Anonymous`, self excluded from its own view). Display name ("River") verified to persist and appear correctly. The T4.1 role-misattribution bug above was caught during this pass — first attempt showed a visitor-sent message stored as `sender: LISTENER`, root-caused to the same-browser dual-cookie scenario, fixed, then re-verified clean. Test data cleaned up from the DB afterward. `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean.
- [x] T4.5 — typing indicator [FR-5.4] — promoted from stretch on request. Ably *presence* on `chat:{id}`, not a raw publish — presence and publish are separately-granted token capabilities (`app/api/ably/token/route.ts`), so a client can broadcast its own typing state without ever gaining the ability to inject a fake `message` event into the transcript, the same spoofing concern T4.1's route split was written to avoid. Token route now takes a `role` param (`visitor`/`listener`), verified server-side against the specific chat via `resolveVisitorChatAccess`/`resolveListenerChatAccess` (`lib/chat.ts` — the combined `hasChatReadAccess` it replaced is gone, dead code once the split existed) and used to set the Ably connection's `clientId`, which is how each side's presence handler tells "me" from "the other participant." Clears after 3s idle or on send. `TypingDots` (`app/_components/TypingDots.tsx`) is the shared three-dot visual, used by both `ChatWidget` and `ListenerChat`.
- [x] T4.6 — Widget polish, requested directly (not from a PRD line): bottom-right bubble/panel open-close animation, per-message send/receive pop-in animation, and message-event sound effects. Bubble and panel are now both always-mounted (previously conditionally rendered), toggled via a CSS scale+fade transition anchored at `origin-bottom-right` and gated by React 19's `inert` prop when hidden — gives a real two-way open *and* close animation instead of an instant swap with only one direction animated. Messages get a `--animate-message-in` keyframe (`app/globals.css`) that fires once per bubble on actual mount, which needed a paired fix: auto-scroll-to-bottom on new message/typing-indicator, since without it a new bubble could pop in below the visible scroll area. Sound (`lib/chat-sounds.ts`) is two Web Audio API oscillator tones synthesized at runtime, not an audio asset — avoids a licensing/binary-asset question for two one-shot blips. Send plays immediately on a successful POST; receive is gated to `payload.sender` being the *other* role, since Ably echoes a sender's own message back to them too and that shouldn't double up as a "received" sound. Sound-on-typing-indicator was considered and deliberately left out (agreed as the noisier option).
- [x] T4.7 — Unread-message browser notification when the widget/chat tab isn't focused — both options built, per direct request: (a) tab title `(N) ` prefix + a small red dot composited onto the favicon at runtime (`lib/favicon-badge.ts`, canvas-drawn over the existing `/favicon.ico`, cached after first build), always-on, no permission; (b) opt-in native `Notification`, gated on both the browser permission *and* a separate on/off toggle so granting permission once doesn't permanently commit to OS popups — body text is a fixed generic string ("New message from Menty B" / "New message in one of your chats"), never real message content, same posture as the AI-triage redaction and anonymous-by-default sessions elsewhere. Shared logic lives in one hook, `lib/useUnreadTabNotifier.ts`, used by both surfaces: `ChatWidget` calls it directly (one chat at a time); `AdminDashboard` lifts a single instance above all open `ListenerChat` panels (a new message in *any* open panel should flip the tab, not just the one currently scrolled into view) and passes it down as an `onVisitorMessage` callback prop. Both surfaces get a small bell toggle button (unfilled/filled state) — `ChatWidget`'s in the panel header (English-only, matching that component's existing no-i18n convention), `AdminDashboard`'s next to "Laufende Chats"/"Ongoing chats" (new `admin.dashboard.notifyOn`/`notifyOff`/`notifyBody` i18n keys, DE/EN). The button is hidden entirely when `Notification` is unsupported or already denied (browsers won't allow re-prompting from script; no point showing a dead toggle).

  Verified live (real dev server, two real browser tabs — a visitor chat and the admin dashboard with a claimed panel open): sent a message from the visitor tab while the admin tab was backgrounded (a real tab switch, `document.visibilityState` confirmed `"hidden"` via direct query) — the admin tab's title correctly became `"(1) overshare.io — …"` and its `<link rel="icon">` was swapped to a composited badge data URL, both confirmed by querying the DOM directly on the backgrounded tab. **Not independently verified live**: (1) the clear-on-refocus half of the same round trip — this browser-automation tooling has no way to actually re-activate a background tab (clicking into it via the `computer` tool executes on that tab's page but doesn't perform a real OS-level tab switch, confirmed by `document.visibilityState` staying `"hidden"` afterward), so this is code-path confidence only (`visibilitychange`/`focus` listeners, the same standard pattern already used successfully elsewhere in this codebase), same honesty pattern as T4.3's reconnect-resync note; (2) the native `Notification` popup itself — clicking the bell correctly invokes `Notification.requestPermission()` (confirmed: a direct call hung the browser's JS execution for the length of a real permission-prompt wait, rather than erroring), but this automated Chrome session has no way to click through the native OS-chrome permission bubble, so the actual popup was never seen to fire. The permission-gating logic itself (`Notification.permission === "granted"`, wrapped in try/catch) is standard-library-thin and low-risk. `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean. Test sessions cleaned up from the DB afterward.

  **Follow-up, requested directly**: an in-app indicator too, not just the tab-level one — a red dot on `ChatWidget`'s round trigger bubble (now shows an unread *count*, capped "9+", instead of a bare dot) while the widget is minimized, and a red dot per row in `AdminDashboard`'s claimed-chat list for a chat whose panel isn't currently open. Both clear the instant their "closed" state ends (widget opens; panel opens) — deliberately a different signal from useUnreadTabNotifier's tab-focus check, since "the chat window itself is minimized" and "the browser tab isn't focused" are independent states (you can have the widget open in a focused tab, or minimized in a focused tab). Also closed a real gap the original tab-level build had: a message on a claimed-but-never-opened chat previously triggered *no* tab notification at all, because `ListenerChat` (the only thing wired to `notifyNewMessage`) doesn't exist until its panel opens. `AdminDashboard`'s existing dashboard-wide Ably connection (already subscribed to presence on every claimed chat for the online/offline indicator, FR-11.4) now also subscribes to `"message"` events on those same channels, skipping ones whose panel is already open (avoids double-counting against `ListenerChat`'s own subscription) — tracked via `openSessionIdsRef` since the subscription effect is keyed on the claimed-chat set, not the open-panel set. Verified live end to end: claimed a fresh test chat, closed its panel, sent a second visitor message — the row picked up a red dot *and* the tab title incremented, both previously missing for this exact case; opening the row's panel cleared the dot and showed the full transcript. On the visitor side: minimized the widget, sent two Listener replies — the trigger bubble showed a "1" then updated correctly, reopening cleared it and revealed both messages. New `admin.dashboard.unread` i18n key (DE/EN, screen-reader-only label). `tsc`/`lint`/`build` all clean, test sessions cleaned up from the DB afterward (including one unrelated stray "dfbdf" test session left over from earlier work, cleaned up as a courtesy while in there).
- [x] T4.8 — Admin/Listener dashboard rewrite, filed against a real bug report: navigating between claimed chats was closing whichever one you'd left, because each chat lived on its own page (`/listener/chat/[id]`) and a Next.js page navigation unmounts the previous page's component tree — Ably connection, presence entry, everything. Root-fixed, not patched: that route is gone; `/listener/queue` is now a single dashboard (`AdminDashboard`) that holds an `openSessionIds` array in client state and renders one `ListenerChat` panel per id side by side, none of them ever unmounting just because attention moved elsewhere. `ListenerChat` no longer takes `initialMessages` as a prop (there's no longer a server-rendered page to fetch it) — it fetches its own history on mount instead, same shape `ChatWidget` already uses. Panel layout persists across a reload via `localStorage` (`anchor-chat:listener-open-sessions`), intersected against a fresh `GET /api/listener/sessions` (new — a Listener's currently-claimed chats, derived from `QueueEntry.status=CLAIMED` since there's no separate ended/resolved state in the schema) so a stale id from a chat the visitor since left doesn't render a dead panel. Multi-select claim: queue rows now have a checkbox + individual "Claim" button, plus a "Claim N" bulk action — no new claim endpoint, just the existing single-claim route (`POST /api/queue/:id/claim`) called once per selected id in parallel, since it was already atomic per-row. Claimed sessions open as panels immediately, matching "claim three, get three chats side by side." Also, requested directly: `AdminNav` (new — logo, "Anchor Chat" + "Admin Panel" label, role-aware links, sign-out) and `Footer` now wrap all four Listener/admin pages (`/listener/queue`, `/listener/profile`, `/admin/applications`, `/admin/listeners`), none of which had any nav/footer chrome before. Scoped to `requireListener()`, not admin-only — the dashboard is core Listener capability (FR-4), not an admin-only surface, even though "Admin Panel" is the fixed heading text as asked.

## Milestone 4.9 — Turquoise/purple redesign, i18n & theme toggle [FR-10]

Requested directly: visual pass taking cues from krisenchat.de's real site
(purple hero block, turquoise CTA, bold condensed type, numbered how-it-works
card, FAQ accordion) reinterpreted in Anchor Chat's own copy/voice — not
their logo, photography, or verbatim text. See the chat log for the explicit
call on this; it's a deliberate, scoped exception to this repo's usual
"don't copy krisenchat" default (`CLAUDE.md`, `research/krisenchat-recon.md`).

- [x] T4.9.1 — Design tokens: turquoise/purple palette (light + dark) in `app/globals.css`; explicit `data-theme` light/dark toggle (`ThemeToggle` component, inline anti-FOUC script in `app/layout.tsx`, localStorage-persisted) [FR-10.2] — followed `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`'s theme pattern exactly (`data-theme` + `suppressHydrationWarning` on `<html>`, `useLayoutEffect` re-apply in `ThemeToggle` for the Strict Mode dev remount case)
- [x] T4.9.2 — `lib/i18n.tsx`: DE/EN dictionary + Context/hook, `LanguageToggle` component, wired into `Nav` [FR-10.1]
- [x] T4.9.3 — Hero restyle: purple block, turquoise CTA, bold headline treatment; translated copy
- [x] T4.9.4 — "How it's used" section restyle: numbered steps + purple/turquoise card visual (CSS shapes, not a copied photo); translated copy
- [x] T4.9.5 — New FAQ accordion section (4th section): for whom / when to use / how long / who's writing, translated, client-side expand/collapse [FR-10.3] — native `<details>`/`<summary>`, no extra JS state needed
- [x] T4.9.6 — Trust section + footer + cookie banner: restyle onto new tokens, translate landing-page strings — pain-points scenario copy also translated (not itemized, but half-German/half-English would've read broken)
- [x] T4.9.7 — Verified live: DE/EN toggle, light/dark toggle, both FAQ accordion and full landing scroll in dark mode, zero hydration errors, `npx tsc --noEmit`/`npm run lint`/`npm run build` all clean. One pre-existing, unrelated runtime error surfaced during testing: `ChatWidget.tsx`'s Ably cleanup (`ably.close()` on an already-closed connection) throws "Connection closed" when a stale queued session from earlier testing reopens the widget — not touched by this milestone, flagged for a separate fix. Narrow-viewport screenshot didn't visibly change on `resize_window` in this tooling (existing responsive Tailwind classes were preserved as-is, not re-verified pixel-by-pixel)

## Milestone 4.95 — Rebrand to overshare.io, neo-brutalist pass

Requested directly. Rebrand from "Anchor Chat" to "overshare.io" (user-facing
brand only — internal identifiers like the session cookie name, localStorage
key prefixes, npm package name, and the GitHub repo slug are left alone,
zero user-visible benefit to touching them). Visual direction: neo-brutalist
(hard offset shadows, thick borders, flat chunky blocks) instead of the soft
rounded-card look from Milestone 4.9. Copy direction: Gen Z / rebel /
brain-rot tone with neurodivergent-affirming slang (ADHD, autism, OCD,
depression) on the playful marketing chrome — badges, buttons, pain-point
tags — while trust/safety copy stays sincere underneath, same "meme hook
then sincere pivot" shape Milestone 2.5 already established, because real
crisis-adjacent visitors read that section and it's not the place for a bit.

- [x] T4.95.1 — Rename user-facing "Anchor Chat" → "overshare.io" across UI (nav/footer/widget/metadata), legal pages, `lib/webauthn.ts` rpName, `lib/email.ts` sender name, docs headers, README, CLAUDE.md — internal plumbing left alone (session cookie name, localStorage key prefixes, npm package name, GitHub repo slug)
- [x] T4.95.2 — Neo-brutalist design tokens in `app/globals.css`: `.nb`/`.nb-sm`/`.nb-pill` (thick border + hard offset shadow) and `.nb-press`/`.nb-press-sm` (press-onto-shadow interaction), plus a third "pop" accent (`--accent-3`, acid yellow) for stickers/badges. Shadow/border color reuses `--ink`, which is near-white in dark mode — reads as a neon glow rather than an invisible black-on-black shadow, no extra dark-mode-specific brutalist tokens needed
- [x] T4.95.3 — Restyled Nav/Hero/PainPoints/HowItWorks/TrustSection/FAQSection/Footer/StartChat/CookieBanner/ThemeToggle/LanguageToggle onto the brutalist system. Logo mark changed from the anchor icon to a rotated "!" chip (anchor no longer fits the overshare concept)
- [x] T4.95.4 — Rewrote `lib/i18n.tsx` DE/EN copy: Gen Z/rebel/brain-rot tone + affectionate (not mocking) neurodivergent slang — ADHD, hyperfixation, executive dysfunction, RSD, masking, meltdown/shutdown, OCD loops, depression — on hero/pain-points/how-it's-used/FAQ; trust section and legal pages (Impressum/Datenschutz/apply/listener profile) stayed sincere, same calibration Milestone 2.5 established. Queue/chat/listener/admin surfaces intentionally untouched (still English, still the old tone) — out of scope, same boundary `docs/technical-requirements.md` already draws for i18n
- [x] T4.95.5 — Hidden "more espresso, less depresso" easter egg — small rotated sticker tucked off the hero block's bottom-left corner, low opacity until hovered
- [x] T4.95.6 — Verified live (both languages, both themes, full scroll): caught and fixed two real contrast bugs while testing — `--color-accent-ink` was never registered in `@theme inline` (a pre-existing gap from Milestone 4.9, not introduced today), so every `text-accent-ink` usage app-wide silently inherited ambient white text on turquoise backgrounds (StartChat CTA, ApplyForm, ListenerChat, ChatWidget, ProfileEditForm, ReviewForm, AdminDashboard buttons all affected — fixed at the token level, one-line fix in `globals.css`); the hero badge also used hardcoded `bg-white` with theme-aware `text-ink`, which went invisible in dark mode (`text-ink` turns near-white there) — switched to `bg-surface`. `tsc`/`lint`/`build` all clean afterward.

## Milestone 4.96 — Accessibility pass + admin panel parity

Requested directly: fix dark-mode contrast, do a broader accessibility check
across the codebase, and bring the Listener/admin panel up to the same bar
as the landing page (overshare.io branding, neo-brutalist look, DE/EN +
light/dark, no footer).

- [x] T4.96.1 — Contrast audit: wrote a one-off WCAG-contrast script (walks the DOM, resolves each text node's effective composited background including opacity/alpha, checks AA thresholds by font size/weight) and ran it in the browser against light and dark, landing and admin, FAQ open/closed. Two real violations found and fixed at the token level in `app/globals.css`: `--accent-2` as small text measured 4.14:1 on a light background (new `--accent-2-text: #6d51d3` token, 5.11:1); Tailwind's `emerald-600`/`red-600` defaults measured under AA against the dark-mode surface color (new `--success-text`/`--error-text` tokens, per-theme values, applied app-wide everywhere those were hardcoded)
- [x] T4.96.2 — Broader accessibility check: no `<img>` tags (nothing to add alt text to), no `outline-none`/focus-ring suppression anywhere, headings already sequential (h1→h2 per section), landmarks already correct (`<header>`/`<main>`/`<footer>`). Found and fixed real gaps: 5 placeholder-only inputs with no accessible name (`ChatWidget`, `ListenerChat`, `ReviewForm`, `BindIdentity`, `/listener/login`) — added `aria-label`; several form inputs across `ApplyForm`/`ReviewForm`/`BindIdentity`/login/`ProfileEditForm`/chat composers had no explicit `text-`/`placeholder:text-` classes, so they inherited invisible-in-dark-mode browser defaults — fixed with explicit `text-ink`/`placeholder:text-muted` everywhere
- [x] T4.96.3 — `AdminNav` rebuilt to match `Nav.tsx`'s actual light/dark-reactive tokens (`bg-bg/95` + `border-ink`) instead of its old fixed `bg-ink text-bg` dark bar — that combo predates dark mode and would've inverted to a *light* bar once dark mode existed, since `--ink`/`--bg` are theme tokens now. Added `LanguageToggle`/`ThemeToggle` to the nav, same "!" logo mark and brutalist system as the landing page, brand renamed to overshare.io. `SignOutButton` restyled to match (was hardcoded for the old dark-bar-only context) and now takes translated `children`
- [x] T4.96.4 — Removed `<Footer />` from all 4 Listener/admin pages (`/listener/queue`, `/listener/profile`, `/admin/applications`, `/admin/listeners`) per direct request — it read as landing-page chrome bolted onto a working tool
- [x] T4.96.5 — Extended `lib/i18n.tsx` with an `admin` namespace (nav, page headings, dashboard/queue, chat composer, applications review, listeners panel, profile form) and wired it through `AdminDashboard`, `ListenerChat`, `ApplicationsReview`, `AdminListenersPanel`, `ProfileEditForm`, plus small new heading components (`QueuePageHeading`, `ProfilePageHeading`, `AdminPageHeading`) since the page shells are Server Components and can't call the translation hook directly. Visitor-facing `ChatWidget`/`BindIdentity` deliberately left English-only — not part of this request, documented in `docs/technical-requirements.md`
- [x] T4.96.6 — Restyled `AdminDashboard`/`ListenerChat`/`ApplicationsReview`/`AdminListenersPanel`/`ProfileEditForm` onto the `.nb`/`.nb-sm`/`.nb-pill` brutalist system, matching the landing page
- [x] T4.96.7 — Re-ran `npm run db:seed` so Menty B's seeded bio picks up the overshare.io rename from Milestone 4.95 (the seed script had been updated but never re-run against the dev DB)
- [x] T4.96.8 — Verified live: contrast script re-run clean (zero violations) on landing + all 4 admin pages, both themes; DE/EN toggle and light/dark toggle both work from `AdminNav`; `tsc`/`lint`/`build` all clean

## Milestone 4.97 — Mobile-first pass + muted-color removal

Requested directly: the landing page and admin panel weren't actually
mobile-optimized despite earlier passes claiming "narrow viewport" checks —
`Nav.tsx`'s header row (logo + wordmark + language/theme toggles + Login
pill) measured wider than a 375–414px phone viewport with no wrap fallback,
a real overflow bug, not a cosmetic one. Also requested: strip the `--muted`
gray token out of the admin panel and landing page (kept for the few
public-but-out-of-scope pages — `/apply`, `/datenschutz`, `/impressum`,
`/listener/login`, `/listeners`) and clean up the Hero section.

- [x] T4.97.1 — Removed `text-muted`/`placeholder:text-muted` from every landing-page and admin-panel component (`Nav`, `Hero`, `PainPoints`, `HowItWorks`, `TrustSection`, `FAQSection`, `Footer`, `CookieBanner`, `ChatWidget`, `LanguageToggle`, `AdminNav`, `AdminDashboard`, `AdminListenersPanel`, `ApplicationsReview`, `ProfileEditForm`, `ListenerChat`, `AdminPageHeading`, `ProfilePageHeading`, `QueuePageHeading`) — swapped for full-contrast `text-ink` (or `text-ink/50`–`/70` where real visual hierarchy was needed, e.g. placeholders), not a re-tinted muted token. `--muted` itself stays defined in `globals.css` since `ApplyForm`/`BindIdentity`/`ReviewForm`/`TypingDots` and the out-of-scope public pages still reference it.
- [x] T4.97.2 — Hero cleanup: dropped the permanently-disabled "AI bestie — still cooking" pill from the primary CTA row (dead weight next to the one real action), dropped the third floating decorative square that sat mid-content and crowded the headline, hid the "more espresso" easter-egg sticker below `sm:` (had nowhere to sit without overlapping the ticker strip on a phone), swapped the headline's raw `text-[13vw]` for controlled `text-4xl sm:text-6xl lg:text-7xl` steps matching every other section heading's pattern. Removed the now-unused `hero.aiSoon` key from `lib/i18n.tsx` (both locales).
- [x] T4.97.3 — Fixed the real Nav overflow bug: header row is now `flex-wrap` with a mobile-first `gap`/padding/icon-size scale-down (`px-4 py-3` → `sm:px-6 sm:py-4`, `h-7 w-7` logo → `sm:h-8 sm:w-8`, etc.) so logo+wordmark+toggles+Login fits one row on a 375px phone instead of squeezing past the viewport edge. Same tightening applied to `AdminNav`.
- [x] T4.97.4 — Landing sections (`PainPoints`/`HowItWorks`/`TrustSection`/`FAQSection`/`Footer`) get a mobile-first spacing scale (`py-14 sm:py-20`, tighter grid gaps below `sm:`) instead of the same fixed `py-20` at every width — less dead whitespace on a phone screen.
- [x] T4.97.5 — `AdminDashboard`'s open-chat panels were fixed `w-80` inside an `overflow-x-auto` row — a horizontal-scroll card deck that's a poor phone pattern. Now `flex-col` (full-width stacked panels) below `sm:`, `flex-row` with the original `w-80` cards at `sm:` and up. `AdminListenersPanel`/`ApplicationsReview` list rows (name + email, name + status) now stack (`flex-col sm:flex-row`) instead of squeezing onto one line on a narrow screen. `ChatWidget`'s fixed bottom-right bubble/panel tightened its mobile offset/margins (`right-4 bottom-20` → `sm:right-6 sm:bottom-24`).
- [x] T4.97.6 — Verified live on a real 390px-wide render (Chrome's `resize_window` tool doesn't actually shrink the viewport in this environment — confirmed via `window.innerWidth` staying pinned at desktop width regardless of the requested size, the same tooling gap T4.9.7 flagged; worked around it with a same-origin `<iframe>` sized to 390×844, which does report a correct `contentWindow.innerWidth`): Nav fits one row, Hero has no overlapping shapes and a single clean CTA, PainPoints/TrustSection/FAQ/Footer all stack single-column with no horizontal overflow. `npx tsc --noEmit`, `npm run lint` both clean. **Not verified live**: the authenticated admin panel (`AdminNav`/`AdminDashboard`/`AdminListenersPanel`/`ApplicationsReview`) at the same mobile width — this environment's Brevo key is live (not console-log fallback), so requesting a magic link to check would have sent a real email; skipped rather than trigger that as a side effect of a visual check. Those components use the identical `flex-col sm:flex-row` / `w-full sm:w-80` / `flex-wrap` patterns just confirmed working on the landing page, but that's code-review confidence, not a live screenshot — revisit with a real login if a rendering bug shows up there.

## Milestone 4.98 — Landing chat widget redesign [FR-3, FR-5.5, FR-5.6]

Requested directly: the landing page's `ChatWidget` had never actually been
revisited since Milestone 4 shipped it — still the soft rounded-card look
from before the neo-brutalist rebrand (4.95), still leading with a queue
position/wait estimate, still showing a "who else is waiting" roster, still
offering the full BindIdentity block (email link / passkey setup) inline.
Scope: restyle onto the same `.nb` system the Listener/admin chat surface
already uses, replace the queue-position lead-in with a welcome → name (or
stay anonymous) → vent flow, and strip out what the admin doesn't want a
first-time visitor seeing yet.

- [x] Restyled `ChatWidget`'s floating panel and round trigger onto `.nb`/`.nb-pill`/`.nb-press` (thick border, hard offset shadow) instead of `rounded-2xl`/`shadow-2xl` — same primitives `ListenerChat`/`AdminDashboard` already use, so the two chat surfaces read as one system
- [x] Round trigger is now always mounted, not gated behind an existing chat (`chatState.kind !== "none"` no longer short-circuits the whole component to `null`) — visible on first landing the whole time, not just after starting a chat
- [x] New welcome step: static welcome copy + a "what should we call you?" name field (optional, defaults to Anonymous) + "Start chatting" — shown once per chat (`introDismissed`, seeded `true` for a returning visitor who already has a session, so they don't get re-asked)
- [x] Removed the roster panel ("see who else is waiting") from the widget entirely per direct request — `GET /api/chat/roster` and `lib/queue.ts`'s `getWaitingQueueEntries` are untouched (still power the Listener queue view), just no longer called from `ChatWidget`. A public waiting-queue section elsewhere on the landing page was raised as a maybe, not committed — see the FR-5.6 note in `docs/product-requirements.md`
- [x] Removed the queue-position/wait-estimate copy ("You're #N in line — ~M minutes") from the widget — replaced with a plain "Sent to Menty B — they'll jump in soon" line shown once the visitor's first message is sent and no Listener has claimed yet. Hardcoded to "Menty B" by name since exactly one Listener is seeded right now; will need to become generic ("a Listener") once a second one exists
- [x] Removed the BindIdentity block (email-me-a-link / passkey setup / "already have a passkey, sign in") from the widget per direct request ("for now"/hide, not delete) — `BindIdentity.tsx` and its backing routes are untouched, just unmounted; same precedent as the OTP provider (T2.4), which is built and tested but hidden pending a real delivery channel
- [x] Backend change to make "vent immediately" possible: `POST /api/chat/:id/messages` no longer requires `access.claimed` for a visitor send — previously the composer was disabled until a Listener joined (FR-5.5's old "Messaging opens once a Listener joins…"), which didn't fit "type your first message and see it sent." A pre-claim message is stored and published on `chat:{id}` same as any other; a Listener who claims later picks it up via `ListenerChat`'s existing fetch-on-mount, no separate code path needed. `lib/chat.ts`'s `VisitorAccess.claimed` field removed as dead weight now nothing reads it
- [x] `StartChat` (Hero's CTA) simplified to just `openWidget()` — session creation now lives entirely in the widget's own welcome step (`POST /api/chat/start` there is idempotent either way, so no behavior changes for a visitor who clicks the Hero button first)
- [x] Confirmed chat sounds (`lib/chat-sounds.ts`'s `playSentSound`/`playReceivedSound`) already applied to this widget from T4.6 — no change needed, just verified live
- [x] `docs/product-requirements.md` updated first, per house rule: FR-3.1/FR-3.2 downgraded from visitor-visible to internal/Listener-only (the position/ETA math still runs, just isn't rendered to the visitor anymore), FR-5.6 marked removed-from-widget with the reasoning, FR-5.5 reworded for the new welcome/vent/confirmation shape
- [x] Cleaned up now-dead code the removals exposed: unused `identified`/passkey lookup in `app/page.tsx` (was only ever used to decide whether to show BindIdentity), unused `hero.ctaPending`/`hero.ctaError` i18n keys (were only used by `StartChat`'s old fetch-pending/error states, which no longer exist now the button is synchronous)
- [x] Verified live (dev server, real DB, no mocks, both themes): fresh session shows the round trigger before any chat exists → click opens the welcome step → entered a name → "Start chatting" creates the session → composer accepts the first message immediately (chat still unclaimed) → "Sent to Menty B — they'll jump in soon" appears under it → ended the chat, reopened, confirmed the welcome step reappears (not skipped) for the next attempt. No roster UI, no BindIdentity UI, dark mode contrast looked correct on the restyled panel. Test data cleaned up (`End chat`) afterward. `npx tsc --noEmit` and `npm run lint` both clean. **Not verified live**: the pre-claim message actually being visible to a Listener on claim (would have required a real magic-link login in an environment with a live Brevo key — same send-a-real-email concern T4.97.6 flagged, skipped rather than trigger it) — confirmed by code path instead (`ListenerChat` fetches full history on mount regardless of when messages were sent, no claimed-only filter exists in `listMessages`)

## Milestone 4.99 — Message attribution + admin panel grid [FR-5.5]

Requested directly, two related asks: (1) every message bubble — on both the
landing widget and the Listener dashboard — should carry a small avatar +
name above it, not just an unlabeled bubble, and the two surfaces should
share the actual rendering code so they can't visually drift again; (2) the
admin dashboard's open-chat panels should never need horizontal scroll on a
wide screen — a max-two-column grid instead, wrapping to further rows with
normal page-level vertical scroll.

- [x] New `app/_components/ChatTranscript.tsx` — the shared transcript renderer `ChatWidget` and `ListenerChat` both now use instead of each keeping its own copy of the bubble markup. Takes `selfSender` (which role the viewer is) plus `visitorName`/`listenerName` and mirrors alignment/coloring accordingly — same bubble ever after, whichever side is looking at it
- [x] Small initials `Avatar` (2px border circle, first letter of the name) rendered above every bubble on both sides, colored to match the bubble beneath it (accent for "self," bg for "other") so the name/avatar row reads as part of the same message unit rather than a separate label
- [x] `ChatWidget`: the visitor's own name (typed in the welcome step, or "Anonymous") now labels their messages; the widget's header bar swapped from the static "overshare.io" wordmark to `LISTENER_NAME` ("Menty B") — the same "who you're talking to, on top" treatment `AdminDashboard` already gives each panel
- [x] `ListenerChat`: now takes `visitorName`/`listenerName` props instead of rendering unlabeled bubbles — `AdminDashboard` resolves both (visitor's `displayName` from `OngoingSession`, Listener's own `displayName` fetched server-side in `/listener/queue/page.tsx` via `prisma.listener.findUnique`) and passes them down per panel
- [x] New `admin.chat.defaultListenerName` i18n key ("Listener") — fallback for a Listener who hasn't set a profile `displayName` yet (T3.5.3: it starts blank), resolved client-side in `AdminDashboard` rather than "You," since the ask was a real name on every message, not a self/other label
- [x] `AdminDashboard`'s open-panel layout changed from `flex-row` + `overflow-x-auto` (horizontal scroll, fixed `w-80` cards) to `grid grid-cols-1 lg:grid-cols-2` — panels now wrap to additional rows and the page scrolls vertically for more, never sideways; panels also gained more usable width per card since they're no longer pinned to a fixed 320px
- [x] Verified live end to end (dev server, real DB, both themes, real admin login — see below): landing widget shows "Menty B" atop the panel and the visitor's own name/avatar above their sent message; admin dashboard with 2 open panels sat side by side with matching name/avatar rows on both sides ("dfg" on the visitor side, "Menty B" on the Listener side), opening a 3rd panel wrapped it to a new row below with page-level vertical scroll, no horizontal scroll appeared at any point. `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean
- [x] Admin-side verification required an actual Listener sign-in (Brevo is live in this environment, not console-log fallback) — asked first per the T4.97.6/4.98 precedent of not triggering a real email send without confirming; user opted to send it, pasted back the magic-link URL from their inbox to complete the check in the automated browser session

## Milestone 4.99.1 — Listener login redesign + Hero decluttering

Requested directly, two small visual asks: `/listener/login` had never been
touched since it shipped in Milestone 3 — still the pre-rebrand
rounded-card/`text-muted` look with no branded header, the one page in the
app that still looked like a different product. And the Hero block's two
decorative corner shapes (the big teal circle, the rotated yellow square)
were asked to go, to make the block easier on the eye.

- [x] `/listener/login` rebuilt onto the `.nb` neo-brutalist system — thick-border/hard-shadow card, `nb-pill`/`nb-press` button, pill input matching `ChatWidget`'s composer treatment — and given the public `Nav` header (logo back to home, language/theme toggle) it previously had none of. Copy stays English-only, same carve-out as `ChatWidget`/`BindIdentity` (this is a pre-auth utility page, not part of the DE/EN landing rollout). `text-muted` swapped for `text-ink/70`, bringing it in line with T4.97.1's app-wide muted-removal — it was on that pass's "kept out of scope" list at the time, now it isn't
- [x] `Hero.tsx`: removed the two `aria-hidden` decorative shape divs (circle top-right, rotated square bottom-right) and the now-unused `overflow-hidden` on the card that existed only to clip them. Badge/headline/CTA/trust line untouched. The hidden "more espresso" easter-egg sticker (separate purpose, already subtle/low-opacity-until-hover) was left alone — not what "the shapes" referred to
- [x] Verified live, both themes: Hero renders as a clean flat purple block with no corner shapes; `/listener/login` matches the rest of the site's look in both light and dark mode, Nav toggles work. `npx tsc --noEmit` and `npm run lint` both clean

## Milestone 5 — Admin dashboard: claimed-chat visibility, activity & archiving [FR-11]

Requested directly: the queue side already shows wait time (FR-3.1/FR-3.2,
`AdminDashboard`'s "waiting since"); the claimed side never got the same
treatment. Right now a claimed chat is just an open transcript panel — no
list of everything currently claimed, no sense of who claimed what or who's
on the other end without opening the panel, no staleness/presence signal,
and no way to filter or get old chats out of the way. See FR-11 in
`docs/product-requirements.md` for the full acceptance criteria.

- [x] T5.1 — Schema: add a `lastSeenAt` timestamp on `Session`, updated on visitor activity (message send, and a lightweight presence heartbeat) — the foundation FR-11.3/FR-11.4's "since last reply"/"last online" math needs, since nothing currently records visitor-side liveness outside message rows — migration `20260818080601_session_last_seen_at`
- [x] T5.2 — `GET /api/listener/sessions`: extend the response with, per claimed session, the claiming Listener's displayName, the visitor's displayName, the last message's timestamp, and computed time-since-last-reply [FR-11.1, FR-11.2, FR-11.3] — `lib/queue.ts`'s `OngoingSession` now carries `listenerDisplayName`/`lastMessageAt`/`lastVisitorMessageAt`/`lastListenerMessageAt`/`visitorLastSeenAt`, computed via one grouped `Message` query per call rather than N+1 (`loadClaimedSessions`, shared with T5.6's archive query). The route itself (`app/api/listener/sessions/route.ts`) is unchanged — it already just returns whatever `getOngoingSessionsForListener` produces.
- [x] T5.3 — New claimed-chat list section in `AdminDashboard`, distinct from the open transcript panels — one row per claimed chat (Listener, visitor, last message time, time since last reply); clicking a row opens/focuses its panel. This is the "improve how the chats look" ask — the claimed side gets the same at-a-glance clarity the queue list already has [FR-11.1, FR-11.2, FR-11.3] — reused the existing "Ongoing chats" section rather than adding a duplicate list next to it, since that section already was "distinct from the open panels"; each row is now a card (name, online dot, claimed-by, since-last-reply) instead of a bare name button, click-to-open-panel behavior unchanged. New `lib/time-format.ts`'s `formatDurationAgo` (minutes → hours → days) replaces the old minutes-only `formatWaitingSince`, since claimed-chat durations can genuinely span days where queue waits never do
- [x] T5.4 — Online/last-online indicator: extend the Ably presence channel already used for typing (T4.5) so the Listener side can read a visitor's current presence state; render "online" or "last online: <time>" per chat in the new list [FR-11.4] — `app/api/ably/token/route.ts` gained a third branch (`role=listener`, no `chatId`): grants `["subscribe", "presence"]` on every chat the caller currently has claimed, computed server-side from `getOngoingSessionsForListener` — the dashboard's existing queue-channel connection reuses this to track online state across every claimed chat without opening a transcript panel. (Originally scoped this to presence-only, no `subscribe` — reverted after T5.7's live pass showed Ably ties reading presence to the `subscribe` capability op specifically, not `presence`; see T5.7's notes for the full story. Not a real privacy loosening: every channel granted here is a chat the Listener already claimed, i.e. already fully authorized to read.) `AdminDashboard` diffs presence subscriptions against the claimed-id set on each `ongoing` change and *awaits* `ably.auth.authorize()` before subscribing newly-claimed channels (also a T5.7 live-pass fix — subscribing before the awaited authorize resolved raced the stale token and 401'd). Falls back to `Session.lastSeenAt` (T5.1) when not currently present.
- [x] T5.5 — Filter control on the claimed-chat list: by visitor last-online time or by time the admin last answered [FR-11.5] — sort-order `<select>` (not a hide-filter) in `AdminDashboard`, ascending so the most-neglected chat by the chosen signal floats to the top; "last answered" reads `lastListenerMessageAt` (new in T5.2's `OngoingSession`)
- [x] T5.6 — Archiving: a chat with no message activity for 40+ days drops out of the active claimed-chat list and default panel restore (`localStorage` open-panel list from T4.8); new read-only `/admin/archive` view lists archived chats [FR-11.6] — no new status field: "archived" is purely derived (`lib/queue.ts`'s `isArchived`, latest of `claimedAt`/`lastMessageAt` older than 40 days), so `getOngoingSessionsForListener` excluding archived rows automatically makes the panel-restore effect (which intersects stored ids against the ongoing list) drop a since-archived panel with no extra code. `getArchivedSessions()` mirrors it (inverted filter, spans every Listener) for the new admin-only `/admin/archive` page (`AdminNav` link + a dashboard-list shortcut link, both gated on `isAdmin`) + `ArchiveList` component (read-only, no claim/open affordance)
- [x] T5.7 — Verified live pass: claimed-chat list renders correct Listener/visitor/timing data, presence indicator flips on tab close/reopen, filter narrows the list correctly, an artificially-backdated chat (test data) drops into the archive view and out of the active list — DB-level: a throwaway script (`prisma/`-adjacent, not committed) created a fresh claimed session and a 41-day-backdated one, confirmed `getOngoingSessionsForListener`/`getArchivedSessions` put each in exactly the right list, then deleted both rows. Live browser pass (real dev server, real DB, admin login via a real magic-link email — confirmed with the user first since Brevo is live in this environment, same precedent as T4.97.6/T4.98/T4.99): caught and fixed two real bugs in the process, not just confirmed the happy path —
  1. The already-running server process on port 3000 was a stale `next start` build from before this milestone's schema migration, throwing a `PrismaClientValidationError` on `lastSeenAt`. Not a code bug — restarted as `next dev` to pick up the regenerated Prisma Client.
  2. Real bug, caught via the Ably browser console: `AdminDashboard`'s presence effect called `ably.auth.authorize()` to pick up a newly-claimed chat's presence capability but didn't *wait* for it before subscribing, so the subscribe attempt raced the still-stale token and 401'd ("Channel denied access based on given capability"). Fixed by sequencing the subscribe loop inside `.then()` after authorize resolves (`AdminDashboard.tsx`). Surfaced a second, more fundamental issue while fixing it: Ably ties reading presence (`presence.get()`/`presence.subscribe`) to the **"subscribe" capability op**, not "presence" (which only grants entering/updating your *own* presence) — confirmed via an Ably console warning naming exactly this. T5.4's original "presence-only, can never read message content" design wasn't achievable as written, so the token route now grants `["subscribe", "presence"]` for the dashboard-wide connection too (`app/api/ably/token/route.ts`) — not a real privacy loosening, since every channel granted there is a chat the Listener has already claimed and is already fully authorized to read.

  After both fixes: claiming a fresh test chat showed it appear in the claimed-chat list in real time, the online dot correctly flipped to "Online" (green) while the visitor tab stayed open, "last online" rendered correctly for chats with no live presence, the sort control re-ordered the list correctly between "last online" and "last answered," and `/admin/archive` rendered (empty state, correct in both light and dark mode) and is unreachable to a non-admin (redirect). Test session + messages cleaned up from the DB afterward.

  **Not independently re-verified live**: the archive view actually listing a real backdated row through the browser UI (proven at the DB-query level instead, via the throwaway script above — re-demonstrating the same already-proven query through the UI wasn't worth another artificial 41-day-old row). **Pre-existing, unrelated**: the "Connection closed" `ably.close()` exception first flagged in T4.9.7 (there, in `ChatWidget.tsx`) also fires from `ListenerChat.tsx`'s presence-enter cleanup in this dev session — same class of dev-mode/Strict-Mode double-effect artifact, not touched by this milestone.

## Milestone 6 — AI-assisted triage · Challenge 3 [FR-6]

- [ ] T6.1 — Pick model provider (Groq or Gemini free tier, or local Ollama) per `docs/hosting-and-scaling.md`, get it behind one `classifyUrgency(text)` function
- [ ] T6.2 — Redaction step: strip email/phone/session token/IP before building the prompt — write this as its own tested unit, not inline [FR-6.2]
- [ ] T6.3 — Unit tests for the redaction step specifically (this is the part that most needs proving) [technical-requirements.md testing]
- [ ] T6.4 — Wire classification into the message-send path; on failure, tag `unclassified` and still deliver [FR-6.3]
- [ ] T6.5 — Show the tier only in the Listener view, never to the visitor [FR-6.4]
- [ ] T6.6 — Write `docs/challenges/ai-triage.md`: exact fields stripped, and what you'd tell an interviewer about the trade-offs

## Milestone 7 — Queue design exercise · Challenge 4

- [ ] T7.1 — Write up the wait-time-estimate algorithm from T1.4 as a standalone doc with the formula and its failure modes (empty history, sudden Listener drop-off)
- [ ] T7.2 — Whiteboard-style writeup: how you'd fairly route an incoming chat across multiple available Listeners (round robin vs. least-loaded vs. skill match) — no code required, `docs/challenges/queue-design.md`

## Milestone 8 — Node vs Python API exercise · Challenge 5

- [ ] T8.1 — Re-implement `POST /api/chat/:id/messages` as a standalone Python (FastAPI) service hitting the same Postgres schema, purely for comparison
- [ ] T8.2 — Write `docs/challenges/node-vs-python.md`: side-by-side trade-offs you actually hit (typing story, async model, deployment story on a free tier)

## Milestone 9 — Code review practice · Challenge 6

- [ ] T9.1 — Pick one finished milestone's code, write a self-review as if reviewing a teammate's PR — what you'd flag, in `docs/challenges/code-review-practice.md`
- [ ] T9.2 — *(optional)* trade a real review with someone else on a snippet from this repo

## Milestone 9.5 — Automated test suite [technical-requirements.md testing]

Zero automated-test infrastructure existed before this milestone — no
runner, no test files, no CI. `docs/technical-requirements.md`'s Testing
expectations section (updated first, per house rule) now names Vitest
(unit/component/integration) + Playwright (E2E) and describes the fuller
scope actually built here, beyond the doc's original bare minimum (redaction
unit tests + one E2E) — this is interview prep, so a couple of component and
integration tests are worth having to talk about even where the doc's own
"no exhaustive coverage" line doesn't require them.

- [x] T9.5.1 — Vitest + React Testing Library + jsdom installed and
  configured (`vitest.config.ts`, `vitest.setup.ts`); `npm test`/
  `npm run test:watch` scripts added
- [x] T9.5.2 — Unit test for `lib/rate-limit.ts` (`lib/rate-limit.test.ts`) —
  the fixed-window limiter the Security NFR section calls out for the
  OTP/magic-link request endpoints
- [x] T9.5.3 — Component tests (React Testing Library):
  `app/_components/ChatWidget.test.tsx` (welcome step → composer enabled,
  Ably mocked out — no real socket needed for this assertion) and
  `app/_components/ApplyForm.test.tsx` (required fields, success/error
  submit states)
- [x] T9.5.4 — Integration tests against a real local Postgres test database
  (`overshare_test`, never the real dev/prod DB — guarded in
  `integration/env.ts`), no mocks: `app/api/queue/[id]/claim/route.integration.test.ts`
  (atomic claim, 409 on a second claim of the same entry, 403 unauthenticated)
  and `app/api/chat/[id]/messages/route.integration.test.ts` (sequence is a
  table-wide autoincrement, not per-chat — assert ordering, not an absolute
  value; 400 on an empty body; 403 for a caller who isn't that chat's
  visitor). `npm run test:integration` builds and runs a second,
  production-mode server (`next start`, distinct `.next-test` build output —
  see `next.config.ts`'s `NEXT_TEST_BUILD` — so it doesn't collide with a
  live `next dev` session's `.next`) and drives it over real HTTP with a
  hand-rolled cookie jar (`integration/auth-helpers.ts`), including a raw
  reimplementation of Auth.js's Credentials sign-in dance (CSRF token +
  `/api/auth/callback/:provider`) to sign in as the seeded Listener with no
  browser involved
- [x] T9.5.5 — Playwright installed and configured (`playwright.config.ts`,
  Chromium only); `npm run test:e2e` script added
- [x] T9.5.6 — `e2e/mvp-flow.spec.ts`: start chat → Listener signs in and
  claims → message round-trip both ways, via real UI interaction in a real
  browser against the same kind of `next start` test server T9.5.4 uses (own
  port, own log file). The visitor stays anonymous — `BindIdentity` has been
  unmounted from `ChatWidget` since Milestone 4.98, so there's no
  visitor-facing sign-in step actually reachable in the current UI; the
  Listener's sign-in is the one this test exercises. No real inbox for
  either magic-link flow: `BREVO_API_KEY`/`BREVO_SENDER_EMAIL` stay unset in
  `.env.test`, so `lib/email.ts`'s existing console-log fallback (same one
  local dev already relies on) writes the sign-in URL to a log file the test
  scrapes. Test-created session/queue-entry/message rows are deleted in
  `afterEach`, and the visitor's display name is unique per run as a second
  safety net against a prior failed run's leftovers being mistaken for the
  current one (this actually happened once during development — a stale
  "River" row from an earlier failure made a `getByRole` locator match two
  elements instead of one).
- [x] T9.5.7 — `.github/workflows/ci.yml`: lint + `tsc --noEmit` + `next
  build` in one job; `npm test` + `npm run test:integration` + `npm run
  test:e2e` against a `postgres:16` service container in a second job,
  `.env.test` written from repo secrets at runtime (same file format/guard
  rails as the local flow). **Not yet verified green** — needs
  `DATABASE_URL`, `AUTH_SECRET`, and `ABLY_API_KEY` added as GitHub repo
  secrets first (adding secrets to a shared repo needs your go-ahead, same
  as this file's convention for anything touching shared/external state);
  push and check the Actions tab once they're added.

Verified live locally (real local Postgres `overshare_test`, real dev-server
alongside a separate test-mode server on a different port so neither
disturbs the other, real Ably): `npm test` (9 tests), `npm run
test:integration` (5 tests, run twice back to back to confirm it's
idempotent — the second run's `sequence` assertions had to be fixed to check
ordering rather than an absolute starting value once this surfaced), and
`npm run test:e2e` (1 test, also run twice back to back) all pass with no
leftover rows in the test DB and no leftover server processes afterward.
`npx tsc --noEmit` and `npm run lint` both clean (the latter needed
`.next-test/**` added to `eslint.config.mjs`'s ignores — Next's own build
output was otherwise being linted as source). `npm run build` (the real
`.next`, not the test build) intentionally **not** re-run in this session to
avoid disturbing the live `next dev` process already running on port 3000
during this work — the test-mode build (`next build` into `.next-test`,
same source tree) succeeded repeatedly, which already exercises the same
build path.

## Milestone 9.6 — Thorough test coverage [technical-requirements.md testing]

Requested directly: Milestone 9.5 deliberately covered a thin slice (1 lib
unit test, 2 components, 2 API routes, 1 E2E flow), matching
`docs/technical-requirements.md`'s original "no exhaustive coverage" stance.
This milestone supersedes that line — every API route gets an integration
test, every testable `lib/` function gets a unit test, components are
scoped to the ~12 with real logic, E2E stays at 1 flow. See
`docs/technical-requirements.md`'s Testing expectations section for the
full scope note, including what's intentionally *not* covered and why
(Canvas/Web-Audio-dependent `lib/` modules, pure-markup components, the
passkey ceremony, real-data-carve-out handling for applications).

- [x] T9.6.1 — Update `docs/technical-requirements.md`'s Testing
  expectations section to reflect this milestone's scope (done first, per
  house rule)
- [x] T9.6.2 — lib unit tests, batch 1: `tokens.ts`, `time-format.ts`,
  `chat-client.ts`
- [x] T9.6.3 — lib unit tests, batch 2: `webauthn.ts`'s pure helpers,
  `i18n.tsx` DE/EN key-parity check
- [x] T9.6.4 — `useUnreadTabNotifier.test.ts` (`renderHook`, jsdom timers)
- [x] T9.6.5 — `email.test.ts` (mocked `fetch`, console-log fallback
  behavior)
- [x] T9.6.6 — Chat lifecycle route integration tests: `start`, `leave`,
  `state`, `display-name`, `heartbeat`, `roster`
- [x] T9.6.7 — Listener/queue route integration tests: `queue` (list),
  `listener/sessions`, `listener/chat/[id]/messages` (incl. the T4.1
  dual-role misattribution regression). Also fixed a harness-level bug this
  task exposed: `signInAsListener` per test/file blew through
  `request-listener-login`'s 5/min rate limit once enough files needed a
  Listener session — `integration/global-setup.ts` now signs in once per
  test run and persists the session (`getSharedListenerJar()` in
  `integration/auth-helpers.ts`), which every integration test task from
  here on uses instead of signing in itself
- [x] T9.6.8 — `ably/token` route integration test (role-based capability
  grants, real Ably REST call, no mock)
- [x] T9.6.9 — Auth-request route integration tests: `request-otp`,
  `request-magic-link`, `request-listener-login`
- [x] T9.6.10 — Passkey route integration tests: `register-options`,
  `auth-options`, `register-verify` (rejection paths only)
- [x] T9.6.11 — Applications route integration tests: list/submit, approve,
  reject (synthetic applicant fixture). The submit endpoint's rate limit is
  3/hour/IP (a real anti-spam constraint, not a per-minute window like the
  others) — approve/reject tests create their fixture applications directly
  via Prisma instead of through the POST route, so they don't compete for
  that tight, run-lifetime-shared budget
- [x] T9.6.12 — Listener/review moderation route integration tests:
  `listeners/me`, `listeners/[id]`, `listeners/[id]/reviews`, `reviews/[id]`.
  `listeners/me` mutates the shared admin Listener's own profile, so its
  test captures and restores the original displayName/bio in
  beforeAll/afterAll rather than leaving it permanently changed for every
  other task's `getSharedListenerJar()` calls
- [x] T9.6.13 — Extract the Ably mock from `ChatWidget.test.tsx` into a
  shared `app/_components/test-helpers/ably-mock.ts`
- [x] T9.6.14 — `AdminDashboard.test.tsx`. Exposed and fixed two real jsdom
  gaps that will affect every future chat-transcript/dashboard component
  test: `Element.prototype.scrollTo` isn't implemented (stubbed globally in
  `vitest.setup.ts`), and the shared Ably mock (T9.6.13) was missing
  `auth.authorize()` and `channels.release()` (added to
  `test-helpers/ably-mock.ts`)
- [x] T9.6.15 — `ListenerChat.test.tsx` + `ChatTranscript.test.tsx`
- [x] T9.6.16 — `ProfileEditForm.test.tsx` + `ReviewForm.test.tsx`
- [x] T9.6.17 — `ApplicationsReview.test.tsx` + `AdminListenersPanel.test.tsx`
- [x] T9.6.18 — `ThemeToggle.test.tsx` + `LanguageToggle.test.tsx`
- [x] T9.6.19 — `BindIdentity.test.tsx` + `ArchiveList.test.tsx`. `BindIdentity`
  is currently unmounted from the live app (Milestone 4.98) but the logic is
  still real — tests cover the email-link flow and the passkey buttons'
  error handling when the options request fails, not the real WebAuthn
  ceremony (jsdom has no browser WebAuthn support; same "handed off, not
  faked" posture as T2.7's live verification)
- [x] T9.6.20 — Full-suite pass: `npm run test:all` green (79 unit/component
  + 77 integration + 1 E2E = 157 tests, all passing), `npx tsc --noEmit` and
  `npm run lint` both clean, `tsconfig.json` free of the auto-added
  `.next-test/**` entries afterward. Live dev server on port 3000 confirmed
  undisturbed throughout, no leftover test-server processes or DB rows
  after the run.

## Milestone 10 — Demo readiness

- [ ] T10.1 — Seed script: synthetic visitor + Listener + a short fictional conversation, runnable from a clean clone [FR-7.3]
- [ ] T10.2 — README "getting started" verified against a genuinely fresh checkout
- [ ] T10.3 — Time a live demo run end to end, confirm it's under 5 minutes (PRD success criterion)
- [ ] T10.4 — Re-read `docs/hosting-and-scaling.md` and make sure you can explain every choice out loud without notes
