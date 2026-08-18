import { afterAll, describe, expect, it } from "vitest";
import { apiFetch, getSharedListenerJar, newCookieJar } from "@/integration/auth-helpers";
import { prisma } from "@/lib/prisma";

// Real applicant data carve-out (docs/technical-requirements.md): synthetic
// test-applicant@example.com-style fixtures only, cleaned up after — same
// convention Milestone 3.5's own manual verification already established.
const SYNTHETIC_EMAIL_1 = "test-applicant-1@example.com";
const SYNTHETIC_EMAIL_2 = "test-applicant-2@example.com";
const SYNTHETIC_EMAIL_LISTING = "test-applicant-listing@example.com";

describe("applications route", () => {
  afterAll(async () => {
    await prisma.listenerApplication.deleteMany({
      where: { email: { in: [SYNTHETIC_EMAIL_1, SYNTHETIC_EMAIL_2, SYNTHETIC_EMAIL_LISTING] } },
    });
  });

  it("rejects an unauthenticated GET (admin-only review list, FR-8.3)", async () => {
    const res = await apiFetch(newCookieJar(), "/api/applications");
    expect(res.status).toBe(403);
  });

  it("lists a pending application for an admin", async () => {
    await prisma.listenerApplication.create({
      data: { name: "Test Applicant", email: SYNTHETIC_EMAIL_LISTING, message: "Why I'd like to join." },
    });

    const res = await apiFetch(getSharedListenerJar(), "/api/applications");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pending: { email: string }[]; reviewed: { email: string }[] };
    expect(body.pending.some((a) => a.email === SYNTHETIC_EMAIL_LISTING)).toBe(true);
  });

  // The submit endpoint's rate limit is tight (3/hour/IP — a public,
  // unauthenticated form, the real anti-spam surface per T3.5.1) and shared
  // across every request in this run regardless of cookies (keyed by IP,
  // "local" in dev). One test exercising the exact boundary, not a loop —
  // budget doesn't allow retries or a second test needing its own calls.
  it("validates, creates real applications, and rate-limits at the 4th request (FR-8.1)", async () => {
    const jar = newCookieJar();
    const submit = (body: Record<string, string>) =>
      apiFetch(jar, "/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    const invalid = await submit({ name: "", email: "", message: "" });
    expect(invalid.status).toBe(400);

    const first = await submit({
      name: "Test Applicant",
      email: SYNTHETIC_EMAIL_1,
      message: "I'd like to volunteer as a Listener.",
    });
    expect(first.status).toBe(200);
    const created = await prisma.listenerApplication.findFirstOrThrow({
      where: { email: SYNTHETIC_EMAIL_1 },
    });
    expect(created.status).toBe("PENDING");

    const second = await submit({
      name: "Test Applicant",
      email: SYNTHETIC_EMAIL_2,
      message: "A second synthetic application.",
    });
    expect(second.status).toBe(200);

    const third = await submit({
      name: "Test Applicant",
      email: SYNTHETIC_EMAIL_2,
      message: "This one should be rate-limited.",
    });
    expect(third.status).toBe(429);
  });
});
