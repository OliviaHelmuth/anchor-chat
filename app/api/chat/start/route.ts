import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishQueueUpdate } from "@/lib/ably-server";
import { getSessionId, setSessionCookie } from "@/lib/session";
import { getQueuePosition, getWaitEstimateSeconds } from "@/lib/queue";

// No request body at all — FR-1.1 is zero fields to start a chat.
export async function POST() {
  try {
    const existingSessionId = await getSessionId();

    // Reload / double-click safety: reuse the existing waiting entry
    // instead of creating a second one for the same browser.
    if (existingSessionId) {
      const position = await getQueuePosition(existingSessionId);
      if (position !== null) {
        const waitSeconds = await getWaitEstimateSeconds(position);
        return NextResponse.json({ sessionId: existingSessionId, position, waitSeconds });
      }
    }

    const session = await prisma.session.create({
      data: { queueEntry: { create: {} } },
    });
    await setSessionCookie(session.id);
    await publishQueueUpdate();

    const position = await getQueuePosition(session.id);
    const waitSeconds = position === null ? 0 : await getWaitEstimateSeconds(position);

    return NextResponse.json({ sessionId: session.id, position, waitSeconds });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not start chat" }, { status: 500 });
  }
}
