import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, newCookieJar, startVisitorSession } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/request-otp", () => {
  let sessionId: string | undefined;

  afterEach(async () => {
    if (!sessionId) return;
    await prisma.otpCode.deleteMany({ where: { sessionId } });
    await prisma.queueEntry.deleteMany({ where: { sessionId } });
    await prisma.session.deleteMany({ where: { id: sessionId } });
    sessionId = undefined;
  });

  it("requires an active session (\"start a chat first\")", async () => {
    const res = await apiFetch(newCookieJar(), "/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid (too short) phone number", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates an OTP code for a valid phone number (never sent for real — no SMS tier exists)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const res = await apiFetch(jar, "/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+15551234567" }),
    });
    expect(res.status).toBe(200);

    const code = await prisma.otpCode.findFirst({ where: { sessionId } });
    expect(code?.phone).toBe("+15551234567");
  });

  it("rate-limits repeated requests (5/min/IP, T2.5)", async () => {
    const jar = newCookieJar();
    sessionId = await startVisitorSession(jar);

    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await apiFetch(jar, "/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+15551234567" }),
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
