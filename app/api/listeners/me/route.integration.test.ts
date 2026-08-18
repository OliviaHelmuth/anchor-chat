import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

// This route mutates the shared admin Listener's own profile (FR-9.1's
// self-serve display name/bio) — capture and restore it, since every other
// integration test task in this run reuses that same seeded identity via
// getSharedListenerJar().
describe("PATCH /api/listeners/me", () => {
  let originalDisplayName: string | null;
  let originalBio: string | null;
  let adminId: string;

  beforeAll(async () => {
    const admin = await prisma.listener.findUniqueOrThrow({
      where: { email: process.env.LISTENER_ADMIN_EMAIL! },
    });
    adminId = admin.id;
    originalDisplayName = admin.displayName;
    originalBio = admin.bio;
  });

  afterAll(async () => {
    await prisma.listener.update({
      where: { id: adminId },
      data: { displayName: originalDisplayName, bio: originalBio },
    });
  });

  it("rejects an unauthenticated caller", async () => {
    const res = await apiFetch(newCookieJar(), "/api/listeners/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Someone" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects a missing display name", async () => {
    const res = await apiFetch(getSharedListenerJar(), "/api/listeners/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "  ", bio: "hi" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a bio over 1000 characters", async () => {
    const res = await apiFetch(getSharedListenerJar(), "/api/listeners/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Menty B", bio: "x".repeat(1001) }),
    });
    expect(res.status).toBe(400);
  });

  it("saves a valid display name and bio", async () => {
    const res = await apiFetch(getSharedListenerJar(), "/api/listeners/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Test Display Name", bio: "Test bio." }),
    });
    expect(res.status).toBe(200);

    const updated = await prisma.listener.findUniqueOrThrow({ where: { id: adminId } });
    expect(updated.displayName).toBe("Test Display Name");
    expect(updated.bio).toBe("Test bio.");
  });
});
