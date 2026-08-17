# Challenge 3 — AI-assisted triage, with privacy as the actual spec

## Why this is likely to come up

The job posting mentions AI integration twice and both times qualifies it
with privacy/security — "integrate and leverage AI models... with a strong
focus on responsible implementation concerning user privacy and security."
That phrasing is the spec. A challenge built around this is testing whether
you treat the privacy design as the deliverable, not the model call.

## How it actually works

1. **Redact before you build the prompt.** Strip anything that identifies
   the person: email, phone, session/user ID, IP address. What's left is the
   message text and nothing else. Do this as its own function you can unit
   test (`tasks/TASKS.md` T6.2/T6.3) — "we redact PII" is not credible
   without a test proving a specific input with an email in it comes out
   clean.
2. **Minimal, fixed prompt.** Don't pass conversation history if the task
   only needs the current message classified — every extra field you send
   upstream is exposure you don't need. If context genuinely improves
   accuracy, that's a real trade-off to name explicitly, not something to
   default into.
3. **Fail open, not closed, for delivery — fail closed for the data.** If the
   model call errors or times out, the message must still reach the
   counselor (FR-6.3) — the AI feature is additive, never a gate. But if the
   *redaction* step itself errors, that should block the call to the model
   entirely (better to under-classify than to leak).
4. **Don't expose the reasoning to the visitor.** The classification is a
   counselor-facing triage aid; showing "you have been flagged as URGENT" to
   the person in crisis is a UX and potentially harmful design mistake, not
   just a data-exposure one.
5. **Log what actually gets sent, in dev.** You can't credibly claim a
   payload is minimal if you've never looked at it. A dev-only log of the
   literal request body sent to the model provider is worth having.

## What we built here

See `tasks/TASKS.md` Milestone 5. One `classifyUrgency(text)` function behind
a provider-agnostic interface (`docs/technical-requirements.md`), so the
redaction logic doesn't change if the model vendor does.

## Questions to have a sharp answer for

- "What exactly gets sent to the model, verbatim?" — be able to paste the
  actual prompt shape from memory, not describe it vaguely.
- "What if the model itself becomes the sensitive-data leak?" — most hosted
  providers offer a no-retention/no-training-on-inputs setting or API
  contract; know whether the one you picked has one, and say so as part of
  the design, not as an afterthought.
- "Why not just have the counselor read every message unfiltered?" — triage
  isn't replacing judgment, it's ordering attention under load; be ready to
  say what the feature is *for*, not just how it's built.
