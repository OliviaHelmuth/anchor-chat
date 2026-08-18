import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("GET /api/chat/roster", () => {
  let sessionIds: string[] = [];

  afterEach(async () => {
    for (const sessionId of sessionIds) {
      await prisma.message.deleteMany({ where: { sessionId } });
      await prisma.queueEntry.deleteMany({ where: { sessionId } });
      await prisma.session.deleteMany({ where: { id: sessionId } });
    }
    sessionIds = [];
  });

  it("returns 404 with no active session", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/chat/roster");
    expect(res.status).toBe(404);
  });

  it("excludes the caller's own entry but shows other waiting visitors (FR-5.6)", async () => {
    const jarA = newCookieJar();
    const sessionA = await startVisitorSession(jarA);
    sessionIds.push(sessionA);
    await prisma.session.update({ where: { id: sessionA }, data: { displayName: "River" } });

    const jarB = newCookieJar();
    const sessionB = await startVisitorSession(jarB);
    sessionIds.push(sessionB);

    const res = await apiFetch(jarB, "/api/chat/roster");
    const body = (await res.json()) as { entries: { position: number; displayName: string }[] };

    // B's own entry is excluded — only A ("River") shows up in B's roster.
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].displayName).toBe("River");
  });
});
