import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/listener-auth";

// FR-8.4 — rejection is a status change only; no Listener row, no login,
// no profile ever exists for this application.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const result = await prisma.listenerApplication.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Already decided" }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not reject this application" }, { status: 500 });
  }
}
