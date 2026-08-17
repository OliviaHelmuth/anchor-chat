import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireListener } from "@/lib/listener-auth";
import { getOngoingSessionsForListener } from "@/lib/queue";

// Backs the admin dashboard's "ongoing chats" list (AdminDashboard) — what
// lets a Listener reopen a panel for a chat they claimed earlier without
// it having stayed visible the whole time.
export async function GET() {
  try {
    const listener = await requireListener();
    if (listener instanceof NextResponse) return listener;

    const sessions = await getOngoingSessionsForListener(listener.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not load your ongoing chats" }, { status: 500 });
  }
}
