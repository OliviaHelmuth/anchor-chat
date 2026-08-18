import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/request-listener-login", () => {
  afterEach(async () => {
    // Only ever touches ListenerLoginToken rows for the seeded admin — no
    // Session/QueueEntry cleanup needed, this route doesn't require one.
    await prisma.listenerLoginToken.deleteMany({
      where: { listener: { email: process.env.LISTENER_ADMIN_EMAIL! } },
    });
  });

  it("rejects a malformed email", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/request-listener-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a login token for a known Listener email", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/request-listener-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: process.env.LISTENER_ADMIN_EMAIL }),
    });
    expect(res.status).toBe(200);

    const token = await prisma.listenerLoginToken.findFirst({
      where: { listener: { email: process.env.LISTENER_ADMIN_EMAIL! } },
    });
    expect(token).not.toBeNull();
  });

  it("responds identically for an unknown email — no enumeration leak", async () => {
    const before = await prisma.listenerLoginToken.count();

    const res = await apiFetch(newCookieJar(), "/api/auth/request-listener-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "definitely-not-a-listener@example.com" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const after = await prisma.listenerLoginToken.count();
    expect(after).toBe(before);
  });

  it("rate-limits repeated requests (5/min/IP)", async () => {
    const jar = newCookieJar();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await apiFetch(jar, "/api/auth/request-listener-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: process.env.LISTENER_ADMIN_EMAIL }),
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
