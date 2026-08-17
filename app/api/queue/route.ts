import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireListener } from "@/lib/listener-auth";
import { getWaitingQueueEntries } from "@/lib/queue";

export async function GET() {
  try {
    const listener = await requireListener();
    if (listener instanceof NextResponse) return listener;

    const entries = await getWaitingQueueEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not load the queue" }, { status: 500 });
  }
}
