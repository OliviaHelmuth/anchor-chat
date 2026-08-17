# Hosting & scaling — Anchor Chat

Two jobs in this doc: (1) what we're actually using today, entirely free, and
(2) a decision framework for when and why you'd move off each free choice —
because the interview-relevant skill isn't "knows free tiers," it's "knows
what breaks first and what you'd reach for instead."

## What we're running on, today, at $0

| Component | Pick | Free tier limit | Why this one |
|---|---|---|---|
| Frontend hosting | **Vercel** (Hobby) | 100GB bandwidth/mo, serverless function limits generous for a demo | Matches krisenchat's real hosting, zero-config Next.js deploys |
| Database | **Neon** (Postgres) | 0.5GB storage, autosuspends when idle | TypeScript/Prisma-native, has an EU (Frankfurt) region on the free tier |
| Realtime | **Ably** | 6M messages/mo, 200 concurrent connections | Highest free connection cap of the managed options; see below for why self-hosting is the alternative, not Pusher |
| AI inference | **Groq** (Llama models) or **Google Gemini** free tier | Groq: generous free rate limits, very fast; Gemini: free quota, easy key | Both genuinely free, no credit card trial trap; pick Groq if latency matters more, Gemini if you want a larger/more capable free model |
| Email (magic link) | **Resend** | 100/day, 3,000/mo | Clean Auth.js integration, generous enough for a demo |
| SMS (OTP) | *(none — see below)* | — | No ongoing free SMS tier exists anywhere; log OTP codes to the server console in dev instead of pretending there's a free option |
| Error tracking | **Sentry** | 5k errors/mo | Matches krisenchat's real stack |
| Repo + CI | **GitHub** + **GitHub Actions** | Unlimited public repos, 2,000 CI minutes/mo private | Standard |

Total monthly cost at demo scale: **$0**, with the honest caveat that Neon's
free Postgres suspends after inactivity (adds ~1s cold-start on the first
query after idle) and Vercel/Neon free functions cold-start too. Worth
knowing, not worth solving for a portfolio project.

## The decision framework

Free-tier defaults are fine until one of five constraints changes. Each one
pushes toward a different next architecture — they don't all point the same
direction, and sometimes they conflict with each other (see the note at the
end).

### 1. Realtime requirement

The question isn't "do we need realtime" (we do) — it's **who holds the
connection**.

| If... | Then... |
|---|---|
| Low/spiky traffic, want zero ops | Stay on a managed pub/sub free tier (Ably/Pusher/Supabase Realtime) | 
| You've outgrown the connection cap, but traffic is still bursty | Move to Ably/Pusher's paid tier — still no server to run, just a bigger number |
| You want to *own* the realtime layer (e.g. to prove you can build it, or to cut a recurring cost) | Run a small always-on Node process with `ws`/socket.io, on a host that supports long-lived connections — **not Vercel serverless functions**, which is the whole reason a managed service exists in the MVP |
| Multiple server instances need to share realtime state | Add Redis pub/sub (or the equivalent built into socket.io's Redis adapter) so a message from a client connected to instance A reaches a client on instance B |

Vercel functions being stateless/short-lived is the actual root cause here —
it's not a hosting preference, it's a hard constraint that shapes the whole
realtime section of `docs/architecture.md`.

### 2. Latency / speed

| If... | Then... |
|---|---|
| Users are all in one region | Single-region DB + single-region functions is fine; don't add edge complexity you don't need |
| Users are spread across countries and TTFB matters | Move rendering to edge functions (Vercel Edge Runtime, Cloudflare Workers) and put a read replica or edge cache (Cloudflare) near each user cluster |
| Realtime fan-out latency matters globally | Prefer a pub/sub provider with a wide PoP network (Ably has one; a single self-hosted `ws` server in one region does not — this is a real trade-off against the "own the realtime layer" option above) |
| AI response time is user-facing (not just background triage) | Groq specifically is worth it here — its inference is unusually fast; a bigger/slower model is the wrong trade if latency is the binding constraint |

### 3. Cost as scale grows

Free tiers are cheapest at *low or spiky* usage because you pay nothing for
idle. They stop being cheapest once usage is *steady and moderate-to-high* —
at that point a small fixed-cost VPS often beats a metered bill.

| Usage pattern | Better economics |
|---|---|
| Spiky, low average, unpredictable | Serverless + managed free/pay-as-you-go tiers (what we're doing) |
| Steady, predictable, moderate load | A cheap always-on VPS (Hetzner ~€4-5/mo) running Postgres + a Node realtime server can undercut several metered SaaS bills combined |
| High, steady load | Reserved/committed-use pricing on a cloud provider, or dedicated infra — well past demo scale |

The crossover isn't a fixed number of users — it's when your *metered* bill
(function-seconds, message counts, connection-hours) predictably exceeds a
fixed server's cost every month. Worth being able to say this out loud in an
interview rather than quoting a specific user count.

### 4. Number of concurrent users

This mostly collides with constraint #1's connection caps directly:

| Free tier | Concurrent connection ceiling |
|---|---|
| Ably free | 200 |
| Pusher free | 200 (100 with older plans) |
| Supabase Realtime free | Bundled into their general free-tier limits, lower than Ably in practice |

For a crisis-chat product specifically, "concurrent users" includes everyone
sitting in the *waiting queue*, not just people in an active chat — so the
real number is higher than it looks from the Listener side. A queue with a
visible wait time (FR-3.1) is exactly the kind of feature that can blow past
a 200-connection free tier faster than you'd expect if it goes viral or
spikes during a crisis event. That's an argument for designing the queue
view to poll on a slow interval as a fallback rather than assuming realtime
is always available at any scale.

### 5. Cross-border / data residency

This is the constraint most specific to *this* domain — a service handling
minors' sensitive (special-category, GDPR Art. 9) data can't just pick
"closest region" for speed; it has to keep data inside a defensible
jurisdiction.

| If... | Then... |
|---|---|
| All users and the operating entity are in the EU, data is sensitive | Pin every component to an EU region explicitly — Vercel functions (`fra1`), Neon/Supabase EU project, and check whether your realtime/AI vendor even offers EU data residency on the tier you're using (many free tiers don't guarantee region, only paid ones do) | 
| Users span multiple jurisdictions with different rules | You likely need per-region deployments or at least per-region *data storage*, with routing logic deciding where a given user's data lands — meaningfully more complex than a single global deployment |
| No real sensitive data (this demo) | Region choice becomes a "know it, don't need to solve it" answer — which is exactly this project's actual position; see `docs/technical-requirements.md` |

Concretely, in the recon (`research/krisenchat-recon.md`) we saw krisenchat's
own Vercel deployment edge-cache in `fra1` (Frankfurt) but the origin
function execute in `iad1` (US East) — a real example of a default that's
easy to leave unexamined. That single header was worth more in an interview
than reciting "GDPR requires EU hosting" abstractly.

## When these constraints conflict

They don't all point the same way. Two examples worth having an answer for:

- **Cost vs. data residency:** the cheapest AI free tiers (Groq, Gemini) may
  not guarantee EU-only processing on a free plan. If residency is a hard
  requirement and cost isn't, that pushes toward a paid EU-region model
  endpoint — or toward a self-hosted open model (Ollama on your own EU VPS),
  which trades a hosting bill for full data control.
- **Latency vs. "own the realtime layer":** wanting to prove you can build
  the WebSocket layer yourself pulls toward a single self-hosted server,
  which then loses the multi-region latency advantage a managed pub/sub
  service gives you for free. Pick one reason and be explicit about which
  trade-off you're making — "I chose to self-host to demonstrate the
  skill, knowing it costs us global latency at this scale" is a strong
  interview answer; silently ignoring the trade-off is not.
