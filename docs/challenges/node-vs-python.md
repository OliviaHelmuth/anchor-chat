# Challenge 5 — Node.js vs. Python for the backend

## Why this is likely to come up

The job posting phrases the backend requirement as "Node.js **or** Python" —
an explicit either/or, not "Node.js" alone. That's either flexibility on
what a candidate is strong in, or a hint that different services in their
real system use different languages (very plausible: a TypeScript API next
to a Python service specifically for AI/ML work is a common real-world
split). Either way, being able to reason about the trade-off — not just
pick a favorite — is the actual skill being probed.

## The comparison, concretely

| Dimension | Node.js (TypeScript) | Python |
|---|---|---|
| Type safety across the stack | Shares types with the Next.js frontend end to end (Prisma → API → client) with zero translation layer | Needs a separate contract (OpenAPI/pydantic schemas) to stay in sync with a TS frontend |
| Async I/O model | Single-threaded event loop, non-blocking I/O by default — a natural fit for an app that's mostly "wait on DB/network, respond" | `asyncio` gets you there too, but it's opt-in per-library, not the default the way it is in Node |
| AI/ML ecosystem | Usable (most model providers have a JS SDK), but thinner | Deeper — most ML tooling, and every provider's most complete SDK, ships Python first |
| Deployment on a free tier | Trivial on Vercel — it's the same deployment as the frontend | Needs its own host (Render/Railway/Fly free tier) since Vercel's Python support isn't a first-class fit for a persistent API service |
| Team cognitive load | One language across the whole stack | A second language, second toolchain, second set of conventions to maintain |

## The honest answer, not the diplomatic one

For the *core* chat CRUD/realtime-trigger API: **Node/TypeScript**, because
sharing types with the Next.js frontend removes a whole category of bugs
(mismatched shapes between client and server) for free, and there's no
deployment-story cost since it rides on the same Vercel project.

For the *AI-specific* piece specifically, if it grows beyond a single
function call into something with real ML tooling needs (embeddings,
fine-tuning, a vector store, model orchestration) — that's where reaching for
Python for just that one service is defensible, accepting the two-language
cost in exchange for ecosystem depth. That's plausibly exactly what
krisenchat's own "Node.js or Python" phrasing is describing.

## What we built here

`tasks/TASKS.md` T7.1 reimplements one endpoint in FastAPI purely to have a
real side-by-side, not a hypothetical one — T7.2 is where the actual
first-hand trade-offs you hit go, which will be more convincing in an
interview than the table above alone.
