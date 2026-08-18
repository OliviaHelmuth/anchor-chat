import { afterEach, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

describe("DELETE /api/reviews/:id", () => {
  let subjectId: string | undefined;

  afterEach(async () => {
    if (!subjectId) return;
    await prisma.listenerReview.deleteMany({ where: { listenerId: subjectId } });
    await prisma.listener.deleteMany({ where: { id: subjectId } });
    subjectId = undefined;
  });

  it("rejects an unauthenticated caller", async () => {
    const res = await apiFetch(newCookieJar(), "/api/reviews/some-id", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("removes a review (FR-9.3)", async () => {
    const subject = await prisma.listener.create({ data: { email: "test-review-delete@example.com" } });
    subjectId = subject.id;
    const admin = await prisma.listener.findUniqueOrThrow({
      where: { email: process.env.LISTENER_ADMIN_EMAIL! },
    });
    const review = await prisma.listenerReview.create({
      data: { body: "Temporary review to delete.", listenerId: subject.id, authorListenerId: admin.id },
    });

    const res = await apiFetch(getSharedListenerJar(), `/api/reviews/${review.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    const gone = await prisma.listenerReview.findUnique({ where: { id: review.id } });
    expect(gone).toBeNull();
  });
});
