# MCP servers for this project

`.mcp.json` at the repo root is currently an empty scaffold on purpose — none
of the servers below need real credentials until we start building, and
committing a config with placeholder secrets is worse than committing nothing.
Add entries here as we actually provision each service.

## Recommended, in the order we'll need them

### 1. Postgres (once the DB is provisioned)

For querying/inspecting the overshare.io schema directly from a session
instead of round-tripping through the app.

```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://USER:PASSWORD@HOST/db"]
}
```

Use the Neon/Supabase connection string from `docs/hosting-and-scaling.md`.
Put the real string in a local, gitignored `.mcp.local.json` override or an
env var reference — never commit a live connection string.

### 2. GitHub (once the repo is pushed)

For issue/PR-aware work once `tasks/TASKS.md` items graduate into actual
GitHub issues.

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
}
```

### 3. Playwright (once there's a UI to click through)

Useful for the realtime-chat-UI and auth-flow challenge tasks specifically —
driving the actual browser to verify a magic-link or OTP flow end to end
beats eyeballing it.

```json
"playwright": {
  "command": "npx",
  "args": ["-y", "@playwright/mcp@latest"]
}
```

### Not recommended for this project

- A generic filesystem MCP — redundant, Claude Code's built-in file tools
  already cover the repo.
- Anything requiring krisenchat's own internal systems — out of scope and,
  per `research/krisenchat-recon.md`, not something we have or should seek
  access to.

## How to add one for real

1. Provision the service (see `docs/hosting-and-scaling.md` for the free-tier
   pick).
2. Add the entry to `.mcp.json`, referencing secrets via `${ENV_VAR}`, never
   inline.
3. Put the actual secret in a local `.env` (gitignored) or your shell profile.
4. Restart the session — project-scoped MCP servers load at startup and ask
   for your approval the first time.
