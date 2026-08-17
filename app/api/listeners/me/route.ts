import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireListener } from "@/lib/listener-auth";

const MAX_DISPLAY_NAME_LENGTH = 60;
const MAX_BIO_LENGTH = 1000;

// Lets a signed-in Listener set their own public displayName/bio (FR-9.1) —
// deliberately self-serve rather than admin-set, since the requirement is
// "no real legal name required beyond what the Listener chooses to show."
export async function PATCH(request: Request) {
  try {
    const listener = await requireListener();
    if (listener instanceof NextResponse) return listener;

    const body = await request.json().catch(() => null);
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const bio = typeof body?.bio === "string" ? body.bio.trim() : "";

    if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json({ error: "Enter a display name" }, { status: 400 });
    }
    if (bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json({ error: "Bio is too long" }, { status: 400 });
    }

    await prisma.listener.update({
      where: { id: listener.id },
      data: { displayName, bio: bio || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not save your profile" }, { status: 500 });
  }
}
