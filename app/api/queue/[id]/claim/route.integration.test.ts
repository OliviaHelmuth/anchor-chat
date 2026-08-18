import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

// T3.4's guard under test: two Listeners claiming the same waiting entry is
// a real race (FR-4.3) — updateMany + count check, not update(), so the
// loser gets a 409 instead of silently overwriting the first claim.
describe("POST /api/queue/:id/claim", () => {
  let sessionId: string;
  let queueEntryId: string;

  beforeAll(async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    queueEntryId = entry.id;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
  });

  it("claims a waiting entry and 409s a second claim of the same entry", async () => {
    const listenerJar = getSharedListenerJar();

    const firstClaim = await apiFetch(listenerJar, `/api/queue/${queueEntryId}/claim`, {
      method: "POST",
    });
    expect(firstClaim.status).toBe(200);
    const firstBody = (await firstClaim.json()) as { ok: boolean; sessionId: string };
    expect(firstBody).toEqual({ ok: true, sessionId });

    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { id: queueEntryId } });
    expect(entry.status).toBe("CLAIMED");

    const secondClaim = await apiFetch(listenerJar, `/api/queue/${queueEntryId}/claim`, {
      method: "POST",
    });
    expect(secondClaim.status).toBe(409);
  });

  it("rejects a claim from an unauthenticated caller", async () => {
    const anonJar = newCookieJar();
    const res = await apiFetch(anonJar, `/api/queue/some-other-id/claim`, { method: "POST" });
    expect(res.status).toBe(403);
  });
});
