import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/chat/leave", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("returns 404 with no active session", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/chat/leave", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("removes the queue entry but keeps the Session row (FR-3.4)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/chat/leave", { method: "POST" });
    expect(res.status).toBe(200);

    const entry = await prisma.queueEntry.findUnique({ where: { sessionId } });
    expect(entry).toBeNull();
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(session).not.toBeNull();
  });

  it("is idempotent — leaving twice is a 200, not an error", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    await apiFetch(jar, "/api/chat/leave", { method: "POST" });
    const second = await apiFetch(jar, "/api/chat/leave", { method: "POST" });
    expect(second.status).toBe(200);
  });
});
