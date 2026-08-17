import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getChatState } from "@/lib/queue";

// Supersedes the old /api/chat/position (Milestone 1): that endpoint could
// only say "waiting at #N" or 404, which is indistinguishable from "never
// started" once a claim (Milestone 3) flips status to CLAIMED. The widget
// needs to tell those apart to know when to switch from the queue view to
// the chat view (T4.2).
export async function GET() {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ kind: "none" });
    }

    const state = await getChatState(sessionId);
    return NextResponse.json(state);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not fetch chat state" }, { status: 500 });
  }
}
