# Product requirements — Anchor Chat

Granular, testable requirements derived from `docs/PRD.md`. Each has an ID so
`tasks/TASKS.md` can reference it directly. "Must" = MVP, "Should" = do if
time allows, "Later" = explicitly deferred per the PRD.

## FR-1 — Anonymous entry

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-1.1 | Visitor can open the chat without any prior account | Must | Landing page → chat starts with zero required fields |
| FR-1.2 | Visitor is assigned an anonymous session identity immediately | Must | A session/user row exists in the DB before any auth step completes |
| FR-1.3 | No name, DOB, or address is ever collected | Must | Grep the schema and forms — none of these fields exist |

## FR-2 — Passwordless authentication

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-2.1 | Visitor can bind their anonymous session to an email via magic link | Must | Clicking the emailed link signs the same browser session in, no password ever entered |
| FR-2.2 | Magic link expires | Must | A link older than 15 minutes is rejected with a clear re-request path |
| FR-2.3 | Magic link is single-use | Must | Second click on a used link fails safely |
| FR-2.4 | Visitor can alternatively bind via one-time phone code | Built, not surfaced | Backend fully implemented and tested (6-digit code, 5min expiry, 5-attempt lockout) — hidden from the UI because no free ongoing SMS-delivery tier exists to send a real code; a real SMS provider is a config change away, not a rewrite. See `docs/hosting-and-scaling.md`. |
| FR-2.5 | Visitor can register a passkey for return visits | Must | Promoted from stretch to built — the only auth method here with zero cost at any scale, no third-party provider needed |

## FR-3 — Queue and wait estimate

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-3.1 | Visitor sees their queue position after starting a chat | Must | Position updates without a manual page refresh |
| FR-3.2 | Visitor sees an estimated wait time | Must | Estimate is computed from current queue depth ÷ available-Listener throughput, not a hardcoded string |
| FR-3.3 | Estimate updates if queue position changes | Should | Live update on Listener pickup or new arrivals ahead in queue |
| FR-3.4 | Visitor can leave the queue and return to the site | Must | Leaving removes the `QueueEntry`, closes the chat widget, no dangling "waiting" row left behind |

## FR-4 — Listener queue view

Role name confirmed against `research/legal-terminology.md`: "Listener" is
safe (plain English, not a licensing-scheme title anywhere checked). Do not
reintroduce "counselor" or "therapist" as the schema/canonical term — both
confirmed risky/prohibited in that doc. "Brain Doc" was considered and
rejected (same doc) — a health-adjacent product is exactly the context
regulators target for informal doctor-adjacent language, and there's no
reason to spend disclaimer budget defending a word with a free substitute
sitting right next to it.

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-4.1 | Seeded Listener account can log in (separate role) | Must | Role check gates access; a visitor session cannot reach this view |
| FR-4.2 | Listener sees a live list of waiting chats | Must | New arrivals appear without refresh |
| FR-4.3 | Listener can claim a chat from the queue | Must | Claimed chat disappears from other Listeners' queue view |
| FR-4.4 | One seeded account ("Menty B") holds an `isAdmin` flag with elevated access beyond a regular Listener | Must | Admin-only routes (application review, approval, removing a Listener listing) reject a non-admin Listener session server-side, same enforcement pattern as the existing role check |

## FR-5 — Realtime messaging

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-5.1 | Messages appear on both sides without polling/refresh | Must | Round-trip latency under ~1s on the free-tier realtime service |
| FR-5.2 | Message order is preserved even under concurrent sends | Must | Server-assigned sequence number or timestamp, not client-trusted order |
| FR-5.3 | Reconnect after a dropped connection resumes without message loss | Should | Client re-fetches any messages sent while disconnected |
| FR-5.4 | Typing indicator | Later | Nice-to-have, not required for the learning goal |
| FR-5.5 | Chat renders as a bottom-right widget (open/collapse, not a full-page takeover); visitor may set an optional display name, defaulting to "Anonymous" if left blank | Must | Widget persists across the landing page; name (or "Anonymous") is what a Listener/other waiting visitors see, never a real identity field |
| FR-5.6 | While in an active or waiting chat, visitor can see who else is currently in the queue, by display name or "Anonymous" | Should | Roster list updates live off the same `queue` channel as FR-3.3, read-only, no visitor identity exposed beyond the display name they themselves chose |

## FR-6 — AI-assisted triage

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-6.1 | Each incoming visitor message is classified into an urgency tier before a Listener sees the queue | Must | Tier (e.g. standard/elevated/urgent) is visible in the Listener queue view |
| FR-6.2 | No directly identifying data (email, phone, session token) is included in the model call | Must | Prompt/payload sent to the model is logged in dev and inspectable — must not contain PII fields |
| FR-6.3 | Model failure doesn't block the message from reaching the Listener | Must | On classification error, message still delivers, tagged "unclassified" |
| FR-6.4 | Classification reasoning is not shown to the visitor | Must | Only the Listener-facing view renders the tier |

## FR-7 — Operability

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-7.1 | App is reachable at a public URL | Must | Deployed on the free tier described in `docs/hosting-and-scaling.md` |
| FR-7.2 | Errors are captured somewhere reviewable | Should | Sentry free tier or equivalent, per hosting doc |
| FR-7.3 | Fresh clone + documented steps reach a running app | Must | Someone else (or future you) can follow README steps and get it running |

## FR-8 — Listener applications & admin vetting

Real data, real applicants — see the carve-out in
`docs/technical-requirements.md`'s privacy section. This is a deliberate,
narrow exception to the "no real user data" rule, scoped to the
application/profile subsystem only; visitor/chat data stays fully synthetic
and anonymous as before.

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-8.1 | A public form lets someone apply to become a Listener (name, email, why they want to join) | Must | Form makes no claim of clinical credentialing anywhere in its copy |
| FR-8.2 | Submitting an application notifies the admin account by email | Must | Resend delivers a notification to the admin's real email on submit |
| FR-8.3 | Admin (Menty B) can review, approve, or reject a pending application | Must | Approve/reject actions are admin-only (FR-4.4), state change is visible in an admin view |
| FR-8.4 | Rejected/pending applicants have no public profile or platform access | Must | Only `approved` status grants a Listener login + profile |

## FR-9 — Listener profiles & peer reviews

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-9.1 | Each approved Listener has a public profile (display name, short bio) | Must | Profile is reachable without authentication, no real legal name required beyond what the Listener chooses to show |
| FR-9.2 | Other approved Listeners can leave a peer review on a Listener's profile | Must | Only accounts with `role=listener, status=approved` can author a review — never an anonymous visitor. Keeps faith with the no-fabricated-testimonial reasoning in Milestone 2.5 of `tasks/TASKS.md`: these are real reviews from real vetted peers, not marketing copy |
| FR-9.3 | Admin can remove a review or a Listener's listing | Must | Same admin-only enforcement as FR-4.4/FR-8.3 |
