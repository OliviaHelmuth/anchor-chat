import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("Listener chat messages route", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.message.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("rejects a Listener who hasn't claimed this chat", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();

    const res = await apiFetch(listenerJar, `/api/listener/chat/${sessionId}/messages`);
    expect(res.status).toBe(403);
  });

  it("lets the claiming Listener read and send messages", async () => {
    const visitorJar = newCookieJar();
    sessionId = await startVisitorSession(visitorJar);

    const listenerJar = getSharedListenerJar();
    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    await apiFetch(listenerJar, `/api/queue/${entry.id}/claim`, { method: "POST" });

    const send = await apiFetch(listenerJar, `/api/listener/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "hey, I'm here" }),
    });
    expect(send.status).toBe(200);
    const sendBody = (await send.json()) as { message: { sender: string } };
    expect(sendBody.message.sender).toBe("LISTENER");

    const read = await apiFetch(listenerJar, `/api/listener/chat/${sessionId}/messages`);
    const readBody = (await read.json()) as { messages: unknown[] };
    expect(readBody.messages).toHaveLength(1);
  });

  // Regression for T4.1: an earlier combined visitor/Listener check
  // misattributed a visitor-sent message as sender: "LISTENER" whenever one
  // browser held both a visitor cookie and a Listener session at once (e.g.
  // the seeded admin testing their own product). The fix split this into
  // two independent routes/resolvers (lib/chat.ts) that never consult each
  // other's identity — this proves that split actually holds under the
  // exact dual-role scenario that broke it.
  it("attributes correctly by route even when one cookie jar holds both a visitor and Listener identity", async () => {
    // Start from the shared Listener session, then layer a fresh visitor
    // session on top of the *same* jar — one browser, two identities.
    const jar = getSharedListenerJar();
    sessionId = await startVisitorSession(jar);

    const entry = await prisma.queueEntry.findUniqueOrThrow({ where: { sessionId } });
    await apiFetch(jar, `/api/queue/${entry.id}/claim`, { method: "POST" });

    const visitorSend = await apiFetch(jar, `/api/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "sent via the visitor route" }),
    });
    const visitorBody = (await visitorSend.json()) as { message: { sender: string } };
    expect(visitorBody.message.sender).toBe("VISITOR");

    const listenerSend = await apiFetch(jar, `/api/listener/chat/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "sent via the listener route" }),
    });
    const listenerBody = (await listenerSend.json()) as { message: { sender: string } };
    expect(listenerBody.message.sender).toBe("LISTENER");
  });
});
