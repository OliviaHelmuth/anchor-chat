import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

type TokenRequestBody = { capability: string; clientId?: string };

// Ably's real token-request serialization doesn't preserve op order within
// a capability array, so comparisons sort both sides.
function expectChatCapability(capability: Record<string, string[]>, chatId: string) {
  expect([...(capability[`chat:${chatId}`] ?? [])].sort()).toEqual(["presence", "subscribe"]);
}

async function fetchToken(
  jar: ReturnType<typeof newCookieJar>,
  params: Record<string, string> = {},
): Promise<TokenRequestBody> {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(jar, `/api/ably/token${qs ? `?${qs}` : ""}`);
  expect(res.status).toBe(200);
  return (await res.json()) as TokenRequestBody;
}

// Real Ably REST call underneath (token issuance) — no mock, per this
// project's no-mocks-for-external-services convention. Never 403s: the
// route always returns *a* token, just scoped to whatever the caller could
// actually prove access to (see lib/chat.ts's resolvers).
describe("GET /api/ably/token", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("grants only the public queue-subscribe capability with no role/chatId", async () => {
    const body = await fetchToken(newCookieJar());
    expect(JSON.parse(body.capability)).toEqual({ queue: ["subscribe"] });
    expect(body.clientId).toBeUndefined();
  });

  it("grants chat subscribe+presence for the chat's own visitor", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const body = await fetchToken(jar, { chatId: sessionId, role: "visitor" });
    const capability = JSON.parse(body.capability);
    expectChatCapability(capability, sessionId);
    expect(body.clientId).toBe("visitor");
  });

  it("does not grant chat access to a visitor requesting someone else's chat", async () => {
    const ownerJar = newCookieJar();
    sessionId = await startVisitorSession(ownerJar);

    const otherJar = newCookieJar();
    const body = await fetchToken(otherJar, { chatId: sessionId, role: "visitor" });
    const capability = JSON.parse(body.capability);
    expect(capability[`chat:${sessionId}`]).toBeUndefined();
    expect(capability).toEqual({ queue: ["subscribe"] });
  });

  it("grants chat subscribe+presence to the Listener who claimed it", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();
    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    await apiFetch(listenerJar, `/api/queue/${entry.id}/claim`, { method: "POST" });

    const body = await fetchToken(listenerJar, { chatId: sessionId, role: "listener" });
    const capability = JSON.parse(body.capability);
    expectChatCapability(capability, sessionId);
    expect(body.clientId).toBe("listener");
  });

  it("grants the dashboard-wide connection presence on every chat the Listener has claimed", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();
    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    await apiFetch(listenerJar, `/api/queue/${entry.id}/claim`, { method: "POST" });

    const body = await fetchToken(listenerJar, { role: "listener" });
    const capability = JSON.parse(body.capability);
    expectChatCapability(capability, sessionId);
    expect(body.clientId).toBe("listener");
  });
});
