import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("GET /api/queue", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("rejects an unauthenticated caller", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/queue");
    expect(res.status).toBe(403);
  });

  it("rejects a visitor session (not a Listener)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);
    const res = await apiFetch(jar, "/api/queue");
    expect(res.status).toBe(403);
  });

  it("lists a waiting entry for an authenticated Listener", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();

    const res = await apiFetch(listenerJar, "/api/queue");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: { sessionId: string }[] };
    expect(body.entries.some((e) => e.sessionId === sessionId)).toBe(true);
  });
});
