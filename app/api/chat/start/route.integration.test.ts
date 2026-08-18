import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/chat/start", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("creates an anonymous session and queue entry (FR-1.1)", async () => {
    const jar = newCookieJar();
    const res = await apiFetch(jar, "/api/chat/start", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionId: string; position: number; waitSeconds: number };
    sessionId = body.sessionId;
    expect(body.position).toBe(1);
    expect(jar.has("anchor_session")).toBe(true);

    const entry = await prisma.queueEntry.findUnique({ where: { sessionId } });
    expect(entry?.status).toBe("WAITING");
  });

  it("is idempotent — reusing the cookie reuses the same session instead of creating a second one", async () => {
    const jar = newCookieJar();
    const first = await apiFetch(jar, "/api/chat/start", { method: "POST" });
    const firstBody = (await first.json()) as { sessionId: string };
    sessionId = firstBody.sessionId;

    const second = await apiFetch(jar, "/api/chat/start", { method: "POST" });
    const secondBody = (await second.json()) as { sessionId: string };
    expect(secondBody.sessionId).toBe(firstBody.sessionId);

    const entries = await prisma.queueEntry.findMany({ where: { sessionId } });
    expect(entries).toHaveLength(1);
  });
});
