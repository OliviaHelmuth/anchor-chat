import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("GET /api/listener/sessions", () => {
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
    const res = await apiFetch(jar, "/api/listener/sessions");
    expect(res.status).toBe(403);
  });

  it("lists a session this Listener has claimed", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();

    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    await apiFetch(listenerJar, `/api/queue/${entry.id}/claim`, { method: "POST" });

    const res = await apiFetch(listenerJar, "/api/listener/sessions");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessions: { sessionId: string }[] };
    expect(body.sessions.some((s) => s.sessionId === sessionId)).toBe(true);
  });
});
