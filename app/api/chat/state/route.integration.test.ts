import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("GET /api/chat/state", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("returns kind 'none' with no session cookie at all", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/chat/state");
    expect(await res.json()).toEqual({ kind: "none" });
  });

  it("returns kind 'waiting' with a position once a chat has started", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/chat/state");
    const body = (await res.json()) as { kind: string; sessionId: string; position: number };
    expect(body.kind).toBe("waiting");
    expect(body.sessionId).toBe(sessionId);
  });
});
