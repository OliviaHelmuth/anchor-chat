# Architecture — overshare.io

## Components

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["Next.js app (React)"]
    end

    subgraph Vercel["Vercel — Next.js deployment"]
        Pages["App Router pages"]
        API["Route Handlers /api/*"]
        AuthJS["Auth.js"]
    end

    subgraph Data["Data layer"]
        PG[("Postgres\n(Neon)")]
    end

    subgraph Realtime["Realtime layer"]
        Ably["Ably\n(pub/sub channels)"]
    end

    subgraph AI["AI layer"]
        Model["LLM provider\n(Groq / Gemini / local Ollama)"]
    end

    subgraph Ops["Observability"]
        Sentry["Sentry"]
    end

    UI -- "HTTPS" --> Pages
    UI -- "fetch" --> API
    UI -- "WebSocket subscribe" --> Ably
    API -- "publish on new message" --> Ably
    API --> AuthJS
    AuthJS -- "session rows" --> PG
    API -- "read/write" --> PG
    API -- "classify(), PII stripped" --> Model
    UI -. "errors" .-> Sentry
    API -. "errors" .-> Sentry
```

Everything client-facing is one Next.js deployment. There is no separate
backend service in the MVP — Route Handlers *are* the backend. The only
reason a second always-on process would enter the picture is if we outgrow
Ably's free tier and self-host the realtime layer (see
`docs/hosting-and-scaling.md`).

## Why realtime is a separate box from the API

Vercel's Route Handlers are serverless: each request spins up, runs, and
exits. They cannot hold a WebSocket connection open waiting for the next
message. So the API's job is narrower than it looks — it writes to Postgres
and then **publishes** an event; it never holds a connection. Ably holds the
actual open connections to every browser tab and fans out the event. This is
the single most important shape decision in the whole system, and it's the
same constraint krisenchat's own Vercel deployment would face — see
`research/krisenchat-recon.md` for why we believe they solve it the same way.

## Sequence — a full chat session

```mermaid
sequenceDiagram
    participant V as Visitor (browser)
    participant API as Route Handler
    participant DB as Postgres
    participant RT as Ably
    participant AI as AI classifier
    participant C as Listener (browser)

    V->>API: POST /api/chat/start
    API->>DB: create anon session + queue entry
    API->>RT: publish queue-update
    RT-->>C: queue-update (new entry)
    RT-->>V: queue-update (roster visible to other waiting visitors, FR-5.6)

    V->>API: POST /api/auth/signin (magic link request)
    API-->>V: "check your email"
    Note over V: clicks link
    V->>API: GET /api/auth/callback/magic-link
    API->>DB: bind session to email, mark verified

    C->>API: POST /api/queue/:id/claim
    API->>DB: assign listener, remove from open queue
    API->>RT: publish queue-update (removed)
    RT-->>C: (other listeners' views update)

    V->>API: POST /api/chat/:id/messages {text}
    API->>AI: classifyUrgency(text, PII stripped)
    AI-->>API: tier
    API->>DB: store message + tier
    API->>RT: publish message on chat:{id}
    RT-->>C: new message + tier
    RT-->>V: message echoed back (delivered state)
```

## Data model (overview)

```mermaid
erDiagram
    SESSION ||--o{ MESSAGE : has
    SESSION ||--o| QUEUE_ENTRY : has
    LISTENER ||--o{ SESSION : claims
    LISTENER ||--o| LISTENER_APPLICATION : "approved from"
    LISTENER ||--o{ LISTENER_REVIEW : "authors (as reviewer)"
    LISTENER ||--o{ LISTENER_REVIEW : "receives (as subject)"
    SESSION {
        string id PK
        string email "nullable until bound"
        string phone "nullable until bound"
        string displayName "nullable, visitor-chosen, defaults to Anonymous in UI"
        string listenerId FK "nullable until claimed"
        datetime createdAt
    }
    QUEUE_ENTRY {
        string sessionId FK
        datetime joinedAt
        string status "waiting|claimed"
    }
    MESSAGE {
        string id PK
        string sessionId FK
        string sender "visitor|listener"
        text body
        string urgencyTier "nullable, set by AI classifier"
        datetime createdAt
    }
    LISTENER {
        string id PK
        string email "real, not synthetic — see technical-requirements.md carve-out"
        string displayName
        string bio "nullable"
        boolean isAdmin "true only for the seeded admin account (Menty B)"
    }
    LISTENER_APPLICATION {
        string id PK
        string name
        string email
        text message
        string status "pending|approved|rejected"
        datetime submittedAt
        datetime decidedAt "nullable"
    }
    LISTENER_REVIEW {
        string id PK
        string subjectListenerId FK
        string authorListenerId FK
        text body
        datetime createdAt
    }
```

Note what's deliberately **not** modeled on `SESSION`: no `dateOfBirth` or
`address` field anywhere, and `displayName` is an optional, visitor-chosen
pseudonym shown to other queue members (FR-5.5) — not an identity field, and
never required (FR-1.3). The schema itself is part of the privacy design, not
just the code that reads from it.

`LISTENER`/`LISTENER_APPLICATION` are the one deliberate exception: real
name, real email, by design (FR-8, FR-9) — see the carve-out in
`docs/technical-requirements.md`. Keep this data on its own tables, never
joined into `SESSION`/`MESSAGE` in a way that would blur visitor anonymity
with Listener identity.

## Request flow for the AI feature specifically

```mermaid
flowchart LR
    M["Raw message"] --> R["Redact step:\nstrip email/phone/session token,\ntruncate to message body only"]
    R --> P["Build minimal prompt:\nbody text + fixed system instructions"]
    P --> L["LLM call"]
    L --> T{"Parse tier"}
    T -->|success| S1["Store tier, broadcast"]
    T -->|failure/timeout| S2["Store as 'unclassified',\nbroadcast anyway (FR-6.3)"]
```

The redact step runs **before** anything leaves our server, so the prompt the
model sees is the smallest possible slice of the conversation. See
`docs/challenges/ai-triage.md` for the exact fields stripped and the
reasoning behind each.

## Deployment topology

- One Vercel project, two environments: `preview` (every branch) and
  `production` (main). Free tier covers both.
- Postgres: one free Neon project, EU region (Frankfurt) — see hosting doc
  for why region is a deliberate choice here, not a default left alone.
- Ably: one free app, EU cluster if available on the free tier at signup
  time (verify — this can change).
- Secrets (DB URL, Ably key, model API key, Brevo key) live in Vercel's
  environment variable store, never in the repo.
