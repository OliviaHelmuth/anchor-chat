---
name: anchor-chat-context
description: Load overshare.io's product, architecture, and current task context in one shot. Use at the start of a session, or whenever asked to "get up to speed" on this project, before proposing or implementing a feature.
---

# overshare.io context loader

Read these four files, in this order, before doing anything else in this
project:

1. `docs/PRD.md` — what we're building and for whom, and what's explicitly
   out of scope. Don't propose scope this file rules out.
2. `docs/technical-requirements.md` — the fixed stack and non-functional
   constraints (privacy/GDPR posture, performance targets). Treat the stack
   choices as fixed unless the user says otherwise; this project intentionally
   mirrors a specific job posting's stated stack.
3. `docs/architecture.md` — how the pieces fit together and talk to each
   other. Any new code should slot into one of the components described here,
   not invent a new one.
4. `tasks/TASKS.md` — what's already done, what's in progress, and what's
   next. Always work from the next unchecked task unless told otherwise.

## After loading

Summarize back in under 5 lines: current milestone, the next open task, and
any requirement in `docs/product-requirements.md` that the next task touches.
Then wait for direction rather than assuming which task to start.

## Guardrails specific to this project

- This is a *demo inspired by* krisenchat.de, not krisenchat's actual product.
  Never pull real branding, copy, or logic from `research/krisenchat-recon.md`
  into product code — that file is reference material about a third party's
  live product, not a source to copy from.
- No real personal data. All chat content, phone numbers, and user records in
  this repo must be synthetic seed data.
- If a task's scope looks like it will take more than ~2 hours, stop and split
  it in `tasks/TASKS.md` before writing code.
