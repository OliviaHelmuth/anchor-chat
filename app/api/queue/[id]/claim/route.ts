import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishQueueUpdate } from "@/lib/ably-server";
import { requireListener } from "@/lib/listener-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const listener = await requireListener();
    if (listener instanceof NextResponse) return listener;

    const { id } = await params;

    // updateMany + count check, not update(): two Listeners claiming the
    // same entry at once is a real race (FR-4.3), and update() would just
    // let the second caller silently overwrite the first's claim.
    const claimed = await prisma.queueEntry.updateMany({
      where: { id, status: "WAITING" },
      data: { status: "CLAIMED", claimedAt: new Date() },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "Already claimed" }, { status: 409 });
    }

    const entry = await prisma.queueEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "Could not claim this chat" }, { status: 500 });
    }
    await prisma.session.update({
      where: { id: entry.sessionId },
      data: { listenerId: listener.id },
    });

    await publishQueueUpdate();

    // sessionId, not the QueueEntry id: that's what the chat lives under
    // (chat:{sessionId}) — AdminDashboard opens a panel for it directly
    // instead of a separate lookup round-trip.
    return NextResponse.json({ ok: true, sessionId: entry.sessionId });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not claim this chat" }, { status: 500 });
  }
}
