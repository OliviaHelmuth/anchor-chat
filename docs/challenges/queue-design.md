# Challenge 4 — Queue & routing design (whiteboard-style)

## Why this is likely to come up

Krisenchat's own product sends an automated wait-time estimate the moment
you start a chat (confirmed in their own onboarding copy — see
`research/krisenchat-recon.md`). That implies a live queue with throughput
tracking, not a static "we'll be with you shortly." A system-design-flavored
question here doesn't need code — it needs you to reason about a live
system under uneven load out loud.

## The core problem

Incoming chats arrive at an unpredictable rate. Counselors become available
at an unpredictable rate. You need to (a) tell a waiting visitor a wait
estimate that's actually close to true, and (b) assign each newly-available
counselor to *someone* fairly.

## Wait-time estimation

```
estimate = queue_depth_ahead_of_me / recent_claim_throughput
```

Where `recent_claim_throughput` is a rolling average (e.g. claims in the last
10 minutes ÷ 10), not a global all-time average — a global average reacts too
slowly to a counselor shift ending or a sudden traffic spike. Failure modes
worth naming unprompted:

- **Cold start:** no claims yet today — fall back to a fixed default rather
  than dividing by zero or showing a nonsense number.
- **Throughput collapse:** all counselors log off at once — the estimate
  should degrade gracefully (visibly say "wait times are longer than usual")
  rather than silently showing a stale, now-wrong number.

## Routing strategies, and when each is right

| Strategy | How it works | When it's the right call |
|---|---|---|
| Round robin | Next available counselor takes the next queue entry, full stop | Simplest, fair by construction, fine when counselors are roughly interchangeable |
| Least-loaded | Assign to whichever available counselor has the fewest active chats | Better when counselors can hold multiple concurrent chats and load should stay balanced |
| Skill/priority match | Route based on flagged urgency (tying into Challenge 3's triage tier) or counselor specialization | Right once you have a signal worth routing on — but adds a starvation risk: a "standard" queue entry can wait indefinitely behind a stream of "urgent" ones if you're not careful |

The skill-match option is the one worth discussing carefully in an
interview, because it's the one with a real failure mode: without an aging
mechanism (bump priority the longer someone waits, regardless of tier), a
naive priority queue can starve low-urgency users indefinitely during a busy
period. Naming that trade-off unprompted is a stronger answer than just
picking "priority queue" and moving on.

## What we built here

`tasks/TASKS.md` T1.4 implements the rolling-average estimate. T6.2 is the
explicit writeup task for the routing-strategy comparison — this file *is*
most of that writeup; extend it if you actually implement more than round
robin.
