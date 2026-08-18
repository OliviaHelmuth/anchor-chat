import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// FR-11.4 — a lightweight "still here" signal, separate from message sends
// (lib/chat-messages.ts's sendMessage already covers that case). Called on
// an interval by ChatWidget while a chat exists, so a visitor who has the
// widget open but isn't actively typing still reads as recently seen rather
// than falling straight back to "last online: <time of last message>".
export async function POST() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 403 });
    }

    // updateMany, not update: idempotent against a session that's already
    // gone (left the queue between the interval firing and this landing),
    // same reasoning as leaveQueue's deleteMany (FR-3.4).
    await prisma.session.updateMany({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not record heartbeat" }, { status: 500 });
  }
}
