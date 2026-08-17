import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { publishQueueUpdate } from "@/lib/ably-server";
import { getSessionId } from "@/lib/session";
import { leaveQueue } from "@/lib/queue";

// Session cookie is left in place — leaving only removes the QueueEntry, so
// a signed-in visitor's identity binding (T2.3) survives if they come back.
export async function POST() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    await leaveQueue(sessionId);
    await publishQueueUpdate();

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not leave queue" }, { status: 500 });
  }
}
