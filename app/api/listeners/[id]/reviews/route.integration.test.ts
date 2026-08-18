import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("POST /api/listeners/:id/reviews", () => {
  let otherListenerId: string | undefined;

  afterEach(async () => {
    if (!otherListenerId) return;
    await prisma.listenerReview.deleteMany({ where: { listenerId: otherListenerId } });
    await prisma.listener.deleteMany({ where: { id: otherListenerId } });
    otherListenerId = undefined;
  });

  it("rejects an unauthenticated caller", async () => {
    const res = await apiFetch(newCookieJar(), "/api/listeners/some-id/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Great to work with." }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks a Listener from reviewing their own profile (FR-9.2)", async () => {
    const jar = getSharedListenerJar();
    const admin = await prisma.listener.findUniqueOrThrow({
      where: { email: process.env.LISTENER_ADMIN_EMAIL! },
    });

    const res = await apiFetch(jar, `/api/listeners/${admin.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Reviewing myself." }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown Listener", async () => {
    const res = await apiFetch(getSharedListenerJar(), "/api/listeners/does-not-exist/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Great to work with." }),
    });
    expect(res.status).toBe(404);
  });

  it("creates a review authored by the requesting Listener", async () => {
    const other = await prisma.listener.create({ data: { email: "test-review-subject@example.com" } });
    otherListenerId = other.id;

    const jar = getSharedListenerJar();
    const admin = await prisma.listener.findUniqueOrThrow({
      where: { email: process.env.LISTENER_ADMIN_EMAIL! },
    });

    const res = await apiFetch(jar, `/api/listeners/${other.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Really thoughtful, great listener." }),
    });
    expect(res.status).toBe(200);

    const review = await prisma.listenerReview.findFirstOrThrow({ where: { listenerId: other.id } });
    expect(review.authorListenerId).toBe(admin.id);
    expect(review.body).toBe("Really thoughtful, great listener.");
  });
});
