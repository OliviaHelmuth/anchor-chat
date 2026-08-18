import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/passkey/register-options", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.passkeyChallenge.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("requires an active session", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/passkey/register-options", {
      method: "POST",
    });
    expect(res.status).toBe(400);
  });

  it("returns well-formed, discoverable-credential registration options and persists a challenge", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/passkey/register-options", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      challengeId: string;
      options: {
        challenge: string;
        rp: { id: string };
        authenticatorSelection: { residentKey: string };
      };
    };

    expect(body.options.challenge).toBeTruthy();
    // Usernameless/discoverable flow (T2.7) — required, not preferred.
    expect(body.options.authenticatorSelection.residentKey).toBe("required");

    const stored = await prisma.passkeyChallenge.findUniqueOrThrow({
      where: { id: body.challengeId },
    });
    expect(stored.sessionId).toBe(sessionId);
    expect(stored.challenge).toBe(body.options.challenge);
  });
});
