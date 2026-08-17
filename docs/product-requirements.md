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
| FR-2.4 | Visitor can alternatively bind via one-time phone code | Should | 6-digit code, expires in 5 minutes, max 5 attempts before lockout |
| FR-2.5 | Visitor can register a passkey for return visits | Later | Deferred per PRD; stretch task in `tasks/TASKS.md` |

## FR-3 — Queue and wait estimate

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-3.1 | Visitor sees their queue position after starting a chat | Must | Position updates without a manual page refresh |
| FR-3.2 | Visitor sees an estimated wait time | Must | Estimate is computed from current queue depth ÷ available-counselor throughput, not a hardcoded string |
| FR-3.3 | Estimate updates if queue position changes | Should | Live update on counselor pickup or new arrivals ahead in queue |

## FR-4 — Counselor queue view

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-4.1 | Seeded counselor account can log in (separate role) | Must | Role check gates access; a visitor session cannot reach this view |
| FR-4.2 | Counselor sees a live list of waiting chats | Must | New arrivals appear without refresh |
| FR-4.3 | Counselor can claim a chat from the queue | Must | Claimed chat disappears from other counselors' queue view |

## FR-5 — Realtime messaging

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-5.1 | Messages appear on both sides without polling/refresh | Must | Round-trip latency under ~1s on the free-tier realtime service |
| FR-5.2 | Message order is preserved even under concurrent sends | Must | Server-assigned sequence number or timestamp, not client-trusted order |
| FR-5.3 | Reconnect after a dropped connection resumes without message loss | Should | Client re-fetches any messages sent while disconnected |
| FR-5.4 | Typing indicator | Later | Nice-to-have, not required for the learning goal |

## FR-6 — AI-assisted triage

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-6.1 | Each incoming visitor message is classified into an urgency tier before a counselor sees the queue | Must | Tier (e.g. standard/elevated/urgent) is visible in the counselor queue view |
| FR-6.2 | No directly identifying data (email, phone, session token) is included in the model call | Must | Prompt/payload sent to the model is logged in dev and inspectable — must not contain PII fields |
| FR-6.3 | Model failure doesn't block the message from reaching the counselor | Must | On classification error, message still delivers, tagged "unclassified" |
| FR-6.4 | Classification reasoning is not shown to the visitor | Must | Only the counselor-facing view renders the tier |

## FR-7 — Operability

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-7.1 | App is reachable at a public URL | Must | Deployed on the free tier described in `docs/hosting-and-scaling.md` |
| FR-7.2 | Errors are captured somewhere reviewable | Should | Sentry free tier or equivalent, per hosting doc |
| FR-7.3 | Fresh clone + documented steps reach a running app | Must | Someone else (or future you) can follow README steps and get it running |
