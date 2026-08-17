# overshare.io — project memory

This repo is interview prep: an original, differently-branded crisis-support
chat demo built to practice for a krisenchat.de Full Stack Engineer technical
challenge. It is **not** krisenchat's code and does not reuse their branding,
copy, or logo — see `research/krisenchat-recon.md` for why that line matters
and what's actually confirmed about their real stack.

## Next.js agent rules

@AGENTS.md

`AGENTS.md` is auto-managed by `next dev` (it rewrites its own block on every
run) — don't hand-edit the content inside it, and do commit it so the tree
stays clean between runs.

## Where things live

- `docs/PRD.md` — vision, users, goals/non-goals. Read this first.
- `docs/product-requirements.md` — the feature list and acceptance criteria.
- `docs/technical-requirements.md` — stack choices and non-functional constraints.
- `docs/architecture.md` — components, data flow, sequence diagrams.
- `docs/hosting-and-scaling.md` — what's hosted where, free tier, and the
  upgrade path per constraint (realtime, latency, cost, scale, data residency).
- `docs/workflow.md` — how we move from spec to shipped task in this repo.
- `docs/challenges/` — one sheet per interview-challenge topic we're practicing.
- `tasks/TASKS.md` — the live backlog. Single source of truth for what's next.
- `research/krisenchat-recon.md` — the actual recon findings on krisenchat.de.

## Working conventions

- Every implementation task starts in `tasks/TASKS.md`, scoped small enough to
  ship in under ~2 hours. If a task doesn't fit that, split it before starting.
- Update `tasks/TASKS.md` checkboxes as you go — don't batch it at the end.
- Requirements changes go in `docs/product-requirements.md` or
  `docs/technical-requirements.md` first, then get reflected in tasks. Don't
  let the task list and the requirements sheets drift apart.
- Stack is fixed to match the job posting: Next.js (App Router) + TypeScript +
  Tailwind on the frontend, Node.js on the backend, Postgres via Prisma. See
  `docs/technical-requirements.md` before introducing a new dependency.
- No real user data, ever, on the visitor/chat side — this is a portfolio
  project, seed data only. **One narrow, deliberate exception:** the Listener
  application/profile subsystem (Milestone 3.5, FR-8/FR-9) collects real
  name/email from real applicants, because the admin is personally vetting
  them. See the carve-out and its conditions in
  `docs/technical-requirements.md` before touching that subsystem — it does
  not license "real data" anywhere else in the app.
- Prefer the free-tier services listed in `docs/hosting-and-scaling.md` unless
  a task explicitly calls for testing a paid-tier constraint.

## Skills

- `anchor-chat-context` (`.claude/skills/anchor-chat-context/SKILL.md`) loads
  the product/architecture context in one shot — invoke it at the start of a
  session instead of re-reading every doc file individually.
