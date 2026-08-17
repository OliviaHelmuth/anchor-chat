import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/listener-auth";

// FR-9.3 — admin can remove a Listener's listing entirely. Cascades onto
// their login tokens and authored/received reviews (schema.prisma), and
// SetNulls any Session.listenerId that pointed at them (past claims aren't
// destroyed, just orphaned the same way a claim always could be).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: "Can't remove your own listing" }, { status: 400 });
    }

    await prisma.listener.deleteMany({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not remove this listing" }, { status: 500 });
  }
}
