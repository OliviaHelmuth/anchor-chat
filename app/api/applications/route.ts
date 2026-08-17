import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/listener-auth";
import { listApplicationsForReview } from "@/lib/applications";
import { sendApplicationNotificationEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

const MAX_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "local";
}

// FR-8.1 — public application form. No auth: anyone can apply, that's the point.
export async function POST(request: Request) {
  try {
    if (isRateLimited(`apply:${clientKey(request)}`, 3, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "Enter your name" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Tell us a bit about why you'd like to join" }, { status: 400 });
    }

    const application = await prisma.listenerApplication.create({
      data: { name, email, message },
    });

    // Best-effort — a failed notification email shouldn't fail the
    // applicant's submission; the admin review view still shows it either way.
    const admin = await prisma.listener.findFirst({ where: { isAdmin: true } });
    if (admin) {
      const reviewUrl = new URL("/admin/applications", request.url).toString();
      await sendApplicationNotificationEmail(admin.email, application, reviewUrl).catch((error) =>
        Sentry.captureException(error)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not submit your application" }, { status: 500 });
  }
}

// FR-8.3 — admin-only review list.
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const applications = await listApplicationsForReview();
    return NextResponse.json(applications);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not load applications" }, { status: 500 });
  }
}
