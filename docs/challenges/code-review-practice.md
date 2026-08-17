# Challenge 6 — Code review as part of the loop

## Why this is likely to come up

The job posting names it directly: "engage in continuous knowledge exchange
and perform thorough code reviews to maintain high coding standards." On a
small team, reviewing is a core function of the role, not a formality — so a
loop might include reviewing existing code rather than only writing new code.

## What a strong review actually checks, in order

1. **Correctness against the spec** — does this match the acceptance
   criteria in `docs/product-requirements.md`, not just "does it run."
2. **The failure modes this project specifically cares about** — for this
   codebase that means: does a new endpoint enforce the counselor/visitor
   role check server-side (security)? Does anything touching the AI
   classifier risk sending an unredacted field (privacy)? Does a realtime
   change preserve message ordering (correctness under concurrency)? A
   generic review checklist misses these; a review grounded in this
   project's actual risk areas (`docs/technical-requirements.md`) doesn't.
3. **Simplicity** — is there an abstraction here earlier than the code
   needed one? Three similar lines beats a premature helper.
4. **Naming and readability** — last, not first. Style nits are real but
   they're the cheapest part of a review to skip if time is short.

## How to practice this concretely

- After finishing any milestone in `tasks/TASKS.md`, before checking it off,
  do T9.1: reread the diff as if it were someone else's PR and write down
  what you'd comment. Actually write it in
  `docs/challenges/code-review-practice.md` (this file) as a running log —
  don't just think it.
- If possible, do T9.2 for real: trade a review with another person on a
  real snippet from this repo. A review you give out loud to someone who
  pushes back is a better rehearsal than one you write alone.

## Review log

*(Add entries here as you complete T9.1 — one short entry per milestone
reviewed, dated, with what you flagged and why.)*
