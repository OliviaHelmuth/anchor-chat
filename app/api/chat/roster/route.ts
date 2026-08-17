import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getWaitingQueueEntries } from "@/lib/queue";

// FR-5.6 — read-only roster for a visitor currently in (or having been in) a
// chat: position + display name/"Anonymous" only, off the same underlying
// query as the Listener's queue view (lib/queue.ts's getWaitingQueueEntries)
// but without exposing the QueueEntry id a visitor has no use for.
export async function GET() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const entries = await getWaitingQueueEntries();
    return NextResponse.json({
      entries: entries
        .filter((entry) => entry.sessionId !== sessionId)
        .map((entry) => ({
          position: entry.position,
          displayName: entry.displayName ?? "Anonymous",
        })),
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not load the roster" }, { status: 500 });
  }
}
