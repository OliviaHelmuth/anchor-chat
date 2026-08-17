# Challenge 2 — Realtime chat UI

## Why this is likely to come up

It's the most visible, most obviously-testable slice of the product: a
message list, a composer, and "does it actually feel instant." Easy to scope
into a 1-2 hour take-home, easy to grade by just using it.

## How it actually works

The part that's easy to get superficially right and subtly wrong is
**ordering and delivery guarantees**, not the UI itself:

- **Optimistic send:** render the visitor's own message immediately on send,
  before server confirmation — otherwise every message feels laggy even
  when the network is fine. Reconcile with the server-confirmed version when
  it arrives (or roll back with a visible error if the send failed).
- **Server-assigned order:** never trust client timestamps to order messages
  — two clients' clocks disagree, and network jitter reorders arrival. The
  server assigns the sequence (an incrementing counter or its own
  timestamp) at write time; clients sort by that, not by arrival order.
- **Reconnect gap:** a dropped WebSocket for 10 seconds means messages sent
  during that window need to be *fetched*, not just waited-for — a pub/sub
  channel delivers to *currently connected* clients, it doesn't replay to
  ones that reconnect, unless the provider specifically offers history/replay
  (Ably does, as a paid-tier feature; the free-tier-safe approach is: on
  reconnect, fetch anything newer than the last message you have).
- **Why not just polling:** polling every N seconds is simpler and works
  fine at very small scale, but it's the wrong default to reach for
  silently — know it's a legitimate fallback (see the queue-view note in
  `docs/hosting-and-scaling.md`), but the "real" answer for a chat product is
  push-based delivery.

## What we built here

See `tasks/TASKS.md` Milestone 4. Ably channel per chat (`chat:{id}`),
server-assigned sequence in Postgres, explicit reconnect re-fetch.

## Questions to have a sharp answer for

- "What happens if two people click send at the exact same millisecond?" —
  the server write path serializes them (DB write order = truth), the
  client-side optimistic render is just a UI nicety layered on top.
- "How would this scale past one server instance?" — the realtime provider
  (Ably) already handles fan-out across instances; if you'd self-hosted
  WebSockets instead, you'd need a shared pub/sub (Redis) so instance A can
  reach a client connected to instance B.
- "What's the actual latency budget end to end?" — be able to name where
  time goes: client → API (write) → DB → publish → provider fan-out → other
  client. If asked to make it faster, know which hop you'd attack first.
