import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

async function createSyntheticApplication(email: string) {
  return prisma.listenerApplication.create({
    data: { name: "Test Applicant", email, message: "Synthetic test application." },
  });
}

describe("POST /api/applications/:id/reject", () => {
  const emails: string[] = [];

  afterEach(async () => {
    await prisma.listener.deleteMany({ where: { email: { in: emails } } });
    await prisma.listenerApplication.deleteMany({ where: { email: { in: emails } } });
    emails.length = 0;
  });

  it("rejects an unauthenticated caller", async () => {
    const app = await createSyntheticApplication("test-reject-unauth@example.com");
    emails.push(app.email);

    const res = await apiFetch(newCookieJar(), `/api/applications/${app.id}/reject`, { method: "POST" });
    expect(res.status).toBe(403);
  });

  it("rejects a pending application — status change only, no Listener row (FR-8.4)", async () => {
    const app = await createSyntheticApplication("test-reject-ok@example.com");
    emails.push(app.email);

    const res = await apiFetch(getSharedListenerJar(), `/api/applications/${app.id}/reject`, {
      method: "POST",
    });
    expect(res.status).toBe(200);

    const updated = await prisma.listenerApplication.findUniqueOrThrow({ where: { id: app.id } });
    expect(updated.status).toBe("REJECTED");

    const listener = await prisma.listener.findUnique({ where: { email: app.email } });
    expect(listener).toBeNull();
  });

  it("returns 409 for an application that's already been decided", async () => {
    const app = await createSyntheticApplication("test-reject-twice@example.com");
    emails.push(app.email);
    const jar = getSharedListenerJar();

    await apiFetch(jar, `/api/applications/${app.id}/reject`, { method: "POST" });
    const second = await apiFetch(jar, `/api/applications/${app.id}/reject`, { method: "POST" });
    expect(second.status).toBe(409);
  });
});
