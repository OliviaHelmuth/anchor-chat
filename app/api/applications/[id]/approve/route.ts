import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/listener-auth";

// FR-8.3/FR-8.4 — approving creates the Listener row (login-capable via the
// existing request-listener-login flow, T3.2); a pending/rejected
// application never gets one. Not derived from application.name — FR-9.1
// says no real legal name is required beyond what the Listener chooses to
// show, so displayName/bio start blank and the Listener sets their own via
// PATCH /api/listeners/me.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const application = await prisma.listenerApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Already decided" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.listenerApplication.update({
        where: { id },
        data: { status: "APPROVED", reviewedAt: new Date() },
      }),
      prisma.listener.upsert({
        where: { email: application.email },
        update: {},
        create: { email: application.email },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not approve this application" }, { status: 500 });
  }
}
