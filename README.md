# Krisenchat Reverse Engineering

Interview prep for a krisenchat.de Full Stack Engineer role. Two things live
here:

1. **Recon** (`research/`) — what we could verify about krisenchat.de's real
   stack from the outside (headers, network requests, JS bundles) plus what
   the job posting states directly.
2. **Anchor Chat** — a small, originally-branded crisis-support chat demo we
   build from scratch to practice the same architecture: passwordless auth,
   a live queue, realtime messaging, and one privacy-conscious AI feature.
   Not a krisenchat clone — see `CLAUDE.md` for why that distinction matters.

## Why this repo is laid out this way

This is also a worked example of a Claude Code project structure, since that
was the second thing asked for. The parts and what each one is *for*:

| Path | Purpose | Claude Code reads it... |
|---|---|---|
| `CLAUDE.md` | Standing instructions & map of the repo | automatically, every session |
| `.claude/skills/anchor-chat-context/` | Packaged context you invoke on demand | when you run `/anchor-chat-context` |
| `.mcp.json` | Project-scoped MCP server config | automatically, on startup (with your approval) |
| `docs/` | Specs — the "why" and "what," written before code | on request / when linked from CLAUDE.md |
| `tasks/TASKS.md` | The "how, broken into steps" — the live backlog | on request / when linked from CLAUDE.md |
| `research/` | Frozen findings, dated — not specs, don't edit to match reality later | on request |

The split that matters most: **docs/ describes intent, tasks/ describes
sequence.** When a requirement changes, edit the doc first, then update the
task list to match — never the reverse. See `docs/workflow.md` for the full
loop.

## Running the app

```
npm install
npm run dev
```

Then open http://localhost:3000. Nothing beyond the default Next.js scaffold
works yet — the app itself is built task by task from `tasks/TASKS.md`
Milestone 0 onward. `DATABASE_URL`, the Ably key, etc. go in a local
`.env.local` (gitignored) once those services are provisioned — see
`docs/hosting-and-scaling.md`.

## Getting started in a session

```
cd "Krisenchat Reverse Engineering"
claude
```

Then either let `CLAUDE.md` guide you, or explicitly say "read
docs/PRD.md and tasks/TASKS.md and let's pick up the next task."
