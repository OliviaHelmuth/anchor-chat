import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/chat/heartbeat", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("returns 403 with no active session", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/chat/heartbeat", { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("bumps lastSeenAt for the current session (FR-11.4)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);
    const before = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const res = await apiFetch(jar, "/api/chat/heartbeat", { method: "POST" });
    expect(res.status).toBe(200);

    const after = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(after.lastSeenAt?.getTime() ?? 0).toBeGreaterThan(before.lastSeenAt?.getTime() ?? 0);
  });
});
