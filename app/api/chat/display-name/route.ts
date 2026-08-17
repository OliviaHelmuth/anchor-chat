import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

const MAX_LENGTH = 40;

// FR-5.5 — optional, visitor-set, never required. Empty/whitespace-only
// clears it back to null (rendered as "Anonymous" everywhere), not stored
// as the literal string, matching displayName's nullable schema comment.
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "No active session" }, { status: 404 });
    }

    const json = await request.json().catch(() => null);
    const raw = typeof json?.displayName === "string" ? json.displayName.trim() : "";
    if (raw.length > MAX_LENGTH) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { displayName: raw || null },
    });

    return NextResponse.json({ displayName: raw || null });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not update name" }, { status: 500 });
  }
}
