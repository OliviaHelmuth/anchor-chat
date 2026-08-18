import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/request-magic-link", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.magicLinkToken.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("requires an active session", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "visitor@example.com" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed email", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a magic-link token bound to the current session", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/request-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "visitor@example.com" }),
    });
    expect(res.status).toBe(200);

    const token = await prisma.magicLinkToken.findFirst({ where: { sessionId } });
    expect(token?.email).toBe("visitor@example.com");
    expect(token?.usedAt).toBeNull();
  });

  it("rate-limits repeated requests (5/min/IP, T2.5)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await apiFetch(jar, "/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "visitor@example.com" }),
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
