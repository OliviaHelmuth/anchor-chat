import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { CookieJar } from "@/integration/auth-helpers";

// T4.1's message-send path under test: server-assigned, strictly increasing
// `sequence` per chat, and a visitor can only read/write their own chat.
describe("POST /api/chat/:id/messages", () => {
  let visitorJar: CookieJar;
  let sessionId: string;

  beforeAll(async () => {
    visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
  });

  it("stores a message and assigns strictly increasing sequence numbers", async () => {
    // sequence is a table-wide autoincrement (prisma/schema.prisma), not
    // per-chat — it never resets, so assert ordering, not an absolute value.
    const first = await apiFetch(visitorJar, `/api/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "hey, is anyone there?" }),
    });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { message: { sequence: number; sender: string } };
    expect(firstBody.message.sender).toBe("VISITOR");

    const second = await apiFetch(visitorJar, `/api/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "just wanted to vent a little" }),
    });
    const secondBody = (await second.json()) as { message: { sequence: number } };
    expect(secondBody.message.sequence).toBeGreaterThan(firstBody.message.sequence);

    const stored = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { sequence: "asc" },
    });
    expect(stored.map((m) => m.sequence)).toEqual([firstBody.message.sequence, secondBody.message.sequence]);
  });

  it("rejects an empty message body", async () => {
    const res = await apiFetch(visitorJar, `/api/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a caller who isn't this chat's visitor", async () => {
    const otherJar = newCookieJar();
    const otherSessionId = await startVisitorSession(otherJar);

    try {
      const res = await apiFetch(otherJar, `/api/chat/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "trying to read someone else's chat" }),
      });
      expect(res.status).toBe(403);
    } finally {
      await prisma.queueEntry.deleteMany({ where: { sessionId: otherSessionId } });
      await prisma.session.deleteMany({ where: { id: otherSessionId } });
    }
  });
});
