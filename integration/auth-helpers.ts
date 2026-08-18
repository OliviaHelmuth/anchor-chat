import { readFileSync } from "node:fs";
import { BASE_URL, SERVER_LOG_PATH, SHARED_LISTENER_SESSION_PATH } from "./config";

/**
 * Cookie-jar-backed fetch against the test server, mirroring what a real
 * browser does across a multi-step sign-in flow. Not a wrapper Playwright
 * needs — its browser context already does this — this is only for the
 * Vitest integration tests, which drive the API directly without a browser.
 */
export type CookieJar = Map<string, string>;

export function newCookieJar(): CookieJar {
  return new Map();
}

function ingestCookies(jar: CookieJar, res: Response): void {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookie) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

export async function apiFetch(jar: CookieJar, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  ingestCookies(jar, res);
  return res;
}

/** Creates a fresh anonymous visitor session (FR-1.1) and returns its sessionId. */
export async function startVisitorSession(jar: CookieJar): Promise<string> {
  const res = await apiFetch(jar, "/api/chat/start", { method: "POST" });
  if (!res.ok) throw new Error(`/api/chat/start failed: ${res.status}`);
  const data = (await res.json()) as { sessionId: string };
  return data.sessionId;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForServerLogLine(pattern: RegExp, timeoutMs = 5000): Promise<RegExpMatchArray> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const content = readFileSync(SERVER_LOG_PATH, "utf-8");
    const match = content.match(pattern);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for a server log line matching ${pattern}`);
}

/**
 * Signs the given jar in as the seeded admin Listener via the real
 * listener-login magic-link flow. No real inbox involved: .env.test leaves
 * BREVO_API_KEY/BREVO_SENDER_EMAIL unset, so lib/email.ts logs the sign-in
 * URL to the server's stdout (captured to SERVER_LOG_PATH by global-setup)
 * instead of sending it — the same fallback local dev already relies on.
 */
export async function signInAsListener(jar: CookieJar, email: string): Promise<void> {
  const requestRes = await apiFetch(jar, "/api/auth/request-listener-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!requestRes.ok) throw new Error(`request-listener-login failed: ${requestRes.status}`);

  const match = await waitForServerLogLine(
    new RegExp(`\\[dev\\] Listener sign-in link for ${escapeForRegex(email)}: (\\S+)`),
  );
  const verifyUrl = new URL(match[1]);
  const token = verifyUrl.searchParams.get("token");
  if (!token) throw new Error(`No token in scraped verify URL: ${verifyUrl}`);

  await completeCredentialsSignIn(jar, "listener-login", { token });
}

/**
 * Returns a fresh jar pre-loaded with the shared Listener session
 * global-setup.ts signed in once for the whole test run. Use this instead
 * of calling signInAsListener directly in most tests — the request-login
 * endpoint is rate-limited (5/min) and a run with dozens of test files each
 * signing in fresh blows through that fast. Only call signInAsListener
 * directly when a test specifically needs its own real sign-in round trip
 * (e.g. testing the login flow itself).
 */
export function getSharedListenerJar(): CookieJar {
  let raw: string;
  try {
    raw = readFileSync(SHARED_LISTENER_SESSION_PATH, "utf-8");
  } catch {
    throw new Error(
      `${SHARED_LISTENER_SESSION_PATH} not found — global-setup.ts should have signed in and written it before any test ran.`,
    );
  }
  return new Map(Object.entries(JSON.parse(raw) as Record<string, string>));
}

/** Mirrors the client-side `signIn(provider, { token, redirect: false })` call in app/auth/verify. */
async function completeCredentialsSignIn(
  jar: CookieJar,
  provider: string,
  fields: Record<string, string>,
): Promise<void> {
  const csrfRes = await apiFetch(jar, "/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: `${BASE_URL}/`,
    redirect: "false",
    ...fields,
  });

  const res = await apiFetch(jar, `/api/auth/callback/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (res.status >= 400) {
    throw new Error(`${provider} sign-in callback failed: ${res.status}`);
  }
}
