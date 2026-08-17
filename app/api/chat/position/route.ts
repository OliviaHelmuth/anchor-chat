import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getQueuePosition, getWaitEstimateSeconds } from "@/lib/queue";

// What the client re-fetches after a queue-channel ping, and what it polls
// on a slow interval as a fallback (docs/hosting-and-scaling.md notes this
// as the right degrade path if realtime is ever unavailable at scale).
export async function GET() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const position = await getQueuePosition(sessionId);
    if (position === null) {
      return NextResponse.json({ error: "Not currently waiting" }, { status: 404 });
    }

    const waitSeconds = await getWaitEstimateSeconds(position);
    return NextResponse.json({ position, waitSeconds });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not fetch position" }, { status: 500 });
  }
}
