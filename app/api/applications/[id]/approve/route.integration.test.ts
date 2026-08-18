import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

// Setup goes straight through Prisma, not the public POST /api/applications
// endpoint — that route is tightly rate-limited (3/hour/IP, see its own
// route.integration.test.ts) and this task isn't testing submission, just
// the review decision, so there's no reason to spend that shared budget.
async function createSyntheticApplication(email: string) {
  return prisma.listenerApplication.create({
    data: { name: "Test Applicant", email, message: "Synthetic test application." },
  });
}

describe("POST /api/applications/:id/approve", () => {
  const emails: string[] = [];

  afterEach(async () => {
    await prisma.listener.deleteMany({ where: { email: { in: emails } } });
    await prisma.listenerApplication.deleteMany({ where: { email: { in: emails } } });
    emails.length = 0;
  });

  it("rejects an unauthenticated caller", async () => {
    const app = await createSyntheticApplication("test-approve-unauth@example.com");
    emails.push(app.email);

    const res = await apiFetch(newCookieJar(), `/api/applications/${app.id}/approve`, { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("approves a pending application and creates a login-capable Listener row (FR-8.3/FR-8.4)", async () => {
    const app = await createSyntheticApplication("test-approve-ok@example.com");
    emails.push(app.email);

    const res = await apiFetch(getSharedListenerJar(), `/api/applications/${app.id}/approve`, {
      method: "POST",
    });
    expect(res.status).toBe(200);

    const updated = await prisma.listenerApplication.findUniqueOrThrow({ where: { id: app.id } });
    expect(updated.status).toBe("APPROVED");
    expect(updated.reviewedAt).not.toBeNull();

    const listener = await prisma.listener.findUnique({ where: { email: app.email } });
    // FR-9.1 — never derived from the applicant's real name; starts blank,
    // the Listener sets their own via PATCH /api/listeners/me.
    expect(listener?.displayName).toBeNull();
  });

  it("returns 404 for an unknown application id", async () => {
    const res = await apiFetch(getSharedListenerJar(), "/api/applications/does-not-exist/approve", {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 for an application that's already been decided", async () => {
    const app = await createSyntheticApplication("test-approve-twice@example.com");
    emails.push(app.email);
    const jar = getSharedListenerJar();

    await apiFetch(jar, `/api/applications/${app.id}/approve`, { method: "POST" });
    const second = await apiFetch(jar, `/api/applications/${app.id}/approve`, { method: "POST" });
    expect(second.status).toBe(409);
  });
});
