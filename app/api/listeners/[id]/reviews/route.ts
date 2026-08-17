import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireListener } from "@/lib/listener-auth";

const MAX_BODY_LENGTH = 2000;

// FR-9.2 — requireListener() is the whole enforcement: a Listener row only
// ever exists via seed (T3.1) or admin approval (T3.5.3), so successfully
// resolving one already means "real, vetted peer," never an anonymous
// visitor session. No separate `status=approved` check needed on top.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const author = await requireListener();
    if (author instanceof NextResponse) return author;

    const { id: listenerId } = await params;

    if (listenerId === author.id) {
      return NextResponse.json({ error: "Can't review your own profile" }, { status: 400 });
    }

    const subject = await prisma.listener.findUnique({ where: { id: listenerId } });
    if (!subject) {
      return NextResponse.json({ error: "Listener not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const reviewBody = typeof body?.body === "string" ? body.body.trim() : "";
    if (!reviewBody || reviewBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json({ error: "Enter a review" }, { status: 400 });
    }

    const review = await prisma.listenerReview.create({
      data: { body: reviewBody, listenerId, authorListenerId: author.id },
    });

    return NextResponse.json({ ok: true, review });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not submit review" }, { status: 500 });
  }
}
