import { describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("DELETE /api/listeners/:id", () => {
  it("rejects an unauthenticated caller", async () => {
    const res = await apiFetch(newCookieJar(), "/api/listeners/some-id", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("blocks an admin from removing their own listing (FR-9.3)", async () => {
    const jar = getSharedListenerJar();
    const admin = await prisma.listener.findUniqueOrThrow({
      where: { email: process.env.LISTENER_ADMIN_EMAIL! },
    });

    const res = await apiFetch(jar, `/api/listeners/${admin.id}`, { method: "DELETE" });
    expect(res.status).toBe(400);

    // Never actually removed — re-fetch to be sure the guard held.
    const stillThere = await prisma.listener.findUnique({ where: { id: admin.id } });
    expect(stillThere).not.toBeNull();
  });

  it("removes a different Listener's listing", async () => {
    const other = await prisma.listener.create({
      data: { email: "test-listener-to-remove@example.com" },
    });

    const res = await apiFetch(getSharedListenerJar(), `/api/listeners/${other.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);

    const gone = await prisma.listener.findUnique({ where: { id: other.id } });
    expect(gone).toBeNull();
  });
});
