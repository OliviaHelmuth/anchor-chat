# PRD — overshare.io

**Status:** draft · **Owner:** you · **Last updated:** 2026-08-17

## Summary

overshare.io is a small, originally-branded demo of a text-based crisis-support
chat platform: someone in distress starts an anonymous chat, sees a live wait
estimate, and gets connected to a volunteer "Listener" (name confirmed safe
in `research/legal-terminology.md`). It exists to practice
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
- **Secondary:** a volunteer "Listener" (working term, see
  `research/legal-terminology.md`) picking up chats from a queue.
- **Admin:** you, as the single account ("Menty B") that reviews Listener
  applications, approves them, and holds elevated access the rest of the
  product doesn't grant — see FR-4.4, FR-8, FR-9 in
  `docs/product-requirements.md`.
- **Real audience of this repo:** you, preparing for an interview, and
  whoever reviews the code with you (interviewer, mentor).

## Goals

1. Ship a working, end-to-end vertical slice: anonymous visitor → passwordless
   sign-in → queued chat → realtime message exchange with a Listener role.
2. Implement one AI-assisted feature (message urgency triage or session
   summarization) with an explicit, defensible privacy design.
3. Make every architectural decision traceable to a reason — stack choice,
   hosting choice, and auth design should each have a one-paragraph "why" you
   can say out loud in an interview.
4. Keep the whole thing free to run and reproducible from a clean checkout.
5. *(Added Milestone 3.5, beyond pure interview-prep scope — an explicit
   portfolio-product goal, not one of the six challenge topics)*: demonstrate
   a lightweight trust/quality mechanism for a peer-support network — a real,
   disclosed Listener application flow, personal admin approval, and public
   profiles carrying peer reviews from *other approved Listeners* (never from
   visitors — see the no-fabricated-testimonials reasoning logged in
   Milestone 2.5 of `tasks/TASKS.md`, which this deliberately stays
   consistent with).

## Non-goals

- Not a real crisis service. No real crisis-response protocol, no claim of
  clinical or safety guarantees, no claim that "Listener" approval constitutes
  any professional license or credential (see
  `research/legal-terminology.md`).
- Not a pixel-for-pixel or content-for-content copy of krisenchat.de.
- Not building a full case-management system — no shift scheduling, no
  Listener-to-Listener handoff, no case notes. The admin/vetting layer
  (Milestone 3.5) is a bounded exception to the old "minimal queue + chat
  view only" line: it's a real, disclosed application → approval → profile
  flow, because the product goal now explicitly includes demonstrating that
  trust mechanism — but it stops there, short of a full ops/admin product.
- Not optimizing for scale we'll never hit — architecture should be
  *scale-aware* (see `docs/hosting-and-scaling.md`) but the MVP targets
  dozens of concurrent users, not thousands.
- Not yet building AI Listener personas — flagged as a real future direction
  (a human-vs-bot distinction will need to be unmistakable in the UI when it
  lands) but out of scope until a milestone is actually scoped for it. Naming
  is open but not "Brain Doc" — see the Later/deferred note below.

## MVP scope

- Anonymous visitor can start a chat and choose a sign-in method (magic link
  or passkey) to make the session resumable.
- Visitor sees a queue-position / wait-estimate indicator.
- A seeded Listener account can view the queue and open a chat; one seeded
  account ("Menty B") also holds admin access.
- Messages sync in realtime between visitor and Listener.
- One AI feature: incoming messages are classified into an urgency tier
  before a Listener sees them, with PII stripped from anything sent to the
  model.
- Deployed and reachable at a public free-tier URL.
- *(Milestone 3.5, added)* Real, disclosed Listener applications routed to
  the admin, admin approval, public Listener profiles, peer reviews from
  other approved Listeners — see FR-8/FR-9.

## Later / explicitly deferred

- Real SMS delivery for the OTP method — the provider (auth.ts's
  `otp-sms-auth`) is built and tested, just not surfaced in the UI, since no
  free ongoing SMS tier exists. Revisit if/when a paid SMS provider is worth
  it; see `docs/hosting-and-scaling.md`.
- WhatsApp as a second channel.
- Multi-language / i18n routing.
- Listener-to-Listener handoff, shift scheduling, reporting.
- AI Listener personas — see the Non-goals note. Naming for these is still
  open, but **not** "Brain Doc": `research/legal-terminology.md` rejected it
  for the whole product (the risk is about a health-adjacent product using
  doctor-adjacent language, not about who — human or AI — is behind it).

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
