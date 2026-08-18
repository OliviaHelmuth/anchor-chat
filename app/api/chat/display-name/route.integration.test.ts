import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("PATCH /api/chat/display-name", () => {
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
    const res = await apiFetch(jar, "/api/chat/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "River" }),
    });
    expect(res.status).toBe(404);
  });

  it("sets a trimmed display name", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/chat/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "  River  " }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ displayName: "River" });

    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.displayName).toBe("River");
  });

  it("clears the name back to null on an empty/whitespace-only value, not a stray string", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);
    await apiFetch(jar, "/api/chat/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "River" }),
    });

    const res = await apiFetch(jar, "/api/chat/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "   " }),
    });
    expect(await res.json()).toEqual({ displayName: null });
  });

  it("rejects a name over 40 characters", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/chat/display-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "x".repeat(41) }),
    });
    expect(res.status).toBe(400);
  });
});
