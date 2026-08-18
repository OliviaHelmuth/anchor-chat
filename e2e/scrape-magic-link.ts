import { readFileSync } from "node:fs";

/**
 * Polls a server log file for a magic-link/listener-login URL that
 * lib/email.ts console-logs whenever BREVO_API_KEY/BREVO_SENDER_EMAIL are
 * unset (see .env.test) — the same fallback local dev already relies on,
 * so this test never needs a real inbox.
 */
export async function scrapeSignInUrl(
  logPath: string,
  email: string,
  linkLabel: "Magic link" | "Listener sign-in link",
  timeoutMs = 10_000,
): Promise<string> {
  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\[dev\\] ${linkLabel} for ${escapedEmail}: (\\S+)`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let content = "";
    try {
      content = readFileSync(logPath, "utf-8");
    } catch {
      // Log file not written yet.
    }
    const match = content.match(pattern);
    if (match) return match[1];
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for a "${linkLabel}" line for ${email} in ${logPath}`);
}
