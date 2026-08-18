import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/passkey/auth-options", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.passkeyChallenge.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("requires an active session", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/passkey/auth-options", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("returns usernameless authentication options (no allowCredentials restriction) and persists a challenge", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/passkey/auth-options", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      challengeId: string;
      options: { challenge: string; allowCredentials?: unknown[] };
    };

    expect(body.options.challenge).toBeTruthy();
    // Usernameless — the passkey picker offers any credential for this
    // origin, identity comes from *which* one is used (auth.ts), not this.
    expect(body.options.allowCredentials ?? []).toHaveLength(0);

    const stored = await prisma.passkeyChallenge.findUniqueOrThrow({
      where: { id: body.challengeId },
    });
    expect(stored.sessionId).toBe(sessionId);
  });
});
