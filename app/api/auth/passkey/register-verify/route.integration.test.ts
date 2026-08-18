import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

// A real WebAuthn ceremony needs an actual authenticator — same limitation
// Milestone 2's T2.7 already documented live ("handed off, not faked").
// These cover the rejection paths a fake/malformed response can actually
// exercise, not a full successful registration.
describe("POST /api/auth/passkey/register-verify", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.passkeyChallenge.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("requires an active session", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/passkey/register-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: "anything", response: {} }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed request (missing challengeId/response)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/passkey/register-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown challengeId", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/passkey/register-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: "does-not-exist", response: { id: "fake" } }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a challenge that belongs to a different session", async () => {
    const ownerJar = newCookieJar();
    sessionId = await startVisitorSession(ownerJar);
    const optionsRes = await apiFetch(ownerJar, "/api/auth/passkey/register-options", {
      method: "POST",
    });
    const { challengeId } = (await optionsRes.json()) as { challengeId: string };

    const otherJar = newCookieJar();
    const otherSessionId = await startVisitorSession(otherJar);
    try {
      const res = await apiFetch(otherJar, "/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, response: { id: "fake" } }),
      });
      expect(res.status).toBe(400);
    } finally {
      await prisma.queueEntry.deleteMany({ where: { sessionId: otherSessionId } });
      await prisma.session.deleteMany({ where: { id: otherSessionId } });
    }
  });

  it("rejects an already-expired challenge", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);
    const optionsRes = await apiFetch(jar, "/api/auth/passkey/register-options", { method: "POST" });
    const { challengeId } = (await optionsRes.json()) as { challengeId: string };

    await prisma.passkeyChallenge.update({
      where: { id: challengeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await apiFetch(jar, "/api/auth/passkey/register-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, response: { id: "fake" } }),
    });
    expect(res.status).toBe(400);
  });
});
