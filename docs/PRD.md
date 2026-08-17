# PRD — Anchor Chat

**Status:** draft · **Owner:** you · **Last updated:** 2026-08-17

## Summary

Anchor Chat is a small, originally-branded demo of a text-based crisis-support
chat platform: someone in distress starts an anonymous chat, sees a live wait
estimate, and gets connected to a volunteer counselor. It exists to practice
for a krisenchat.de Full Stack Engineer technical challenge — it demonstrates
the same architecture (passwordless auth, live queue, realtime messaging, one
privacy-conscious AI feature) without being krisenchat's product. See
`research/krisenchat-recon.md` for what that recon covered and
`CLAUDE.md` for why the two must stay separate.

## Problem statement

A take-home or pairing challenge for this role will very likely touch one of:
a passwordless auth flow, a realtime chat surface, or an AI feature scoped
around privacy. Reading about these isn't the same as having built them. This
project forces the actual decisions — token expiry, message ordering,
what-not-to-send-to-an-LLM — under a small, finishable scope.

## Target users

- **Primary (in the fiction of the product):** a young person in crisis,
  under 25, who wants to talk to someone without creating an account or
  giving their name.
- **Secondary:** a volunteer counselor picking up chats from a queue.
- **Real audience of this repo:** you, preparing for an interview, and
  whoever reviews the code with you (interviewer, mentor).

## Goals

1. Ship a working, end-to-end vertical slice: anonymous visitor → passwordless
   sign-in → queued chat → realtime message exchange with a counselor role.
2. Implement one AI-assisted feature (message urgency triage or session
   summarization) with an explicit, defensible privacy design.
3. Make every architectural decision traceable to a reason — stack choice,
   hosting choice, and auth design should each have a one-paragraph "why" you
   can say out loud in an interview.
4. Keep the whole thing free to run and reproducible from a clean checkout.

## Non-goals

- Not a real crisis service. No real user data, no real crisis-response
  protocol, no claim of clinical or safety guarantees.
- Not a pixel-for-pixel or content-for-content copy of krisenchat.de.
- Not building a counselor-training or case-management system — the counselor
  side is a minimal queue + chat view, not a full admin product.
- Not optimizing for scale we'll never hit — architecture should be
  *scale-aware* (see `docs/hosting-and-scaling.md`) but the MVP targets
  dozens of concurrent users, not thousands.

## MVP scope

- Anonymous visitor can start a chat and choose a sign-in method (magic link
  or OTP) to make the session resumable.
- Visitor sees a queue-position / wait-estimate indicator.
- A seeded "counselor" account can view the queue and open a chat.
- Messages sync in realtime between visitor and counselor.
- One AI feature: incoming messages are classified into an urgency tier
  before a counselor sees them, with PII stripped from anything sent to the
  model.
- Deployed and reachable at a public free-tier URL.

## Later / explicitly deferred

- Passkeys as a second auth method (magic link/OTP covers the "passwordless"
  learning goal; passkeys is a stretch task, see `tasks/TASKS.md`).
- WhatsApp as a second channel.
- Multi-language / i18n routing.
- Counselor-to-counselor handoff, shift scheduling, reporting.

## Success criteria

- You can demo the full slice live, from a cold start, in under 5 minutes.
- You can explain every hosting and stack decision by pointing at a specific
  constraint in `docs/hosting-and-scaling.md`, not "because that's what
  krisenchat uses."
- All six practice-challenge topics in `docs/challenges/` have at least a
  working, explainable answer — not necessarily all fully built.

## Key risks

- **Scope creep toward a real clone.** Mitigated by the non-goals above and
  by keeping branding, copy, and domain names clearly distinct from
  krisenchat's.
- **Free-tier limits interrupting a live demo** (cold starts, connection
  caps). Mitigated in `docs/hosting-and-scaling.md` — know the limits before
  you hit them mid-interview.
- **Treating "AI feature" as a bolt-on.** The job posting's own language
  ("responsible implementation concerning user privacy and security") makes
  the privacy design the actual thing being evaluated, not the model call.
