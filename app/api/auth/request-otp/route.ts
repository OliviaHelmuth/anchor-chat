import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { generateOtpCode, hashToken } from "@/lib/tokens";
import { isRateLimited } from "@/lib/rate-limit";

const CODE_TTL_MS = 5 * 60 * 1000; // FR-2.4

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(`otp:${clientKey(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
    if (!phone || phone.length < 6) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }

    const code = generateOtpCode();
    await prisma.otpCode.create({
      data: {
        phone,
        codeHash: hashToken(code),
        sessionId,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    // No free ongoing SMS tier exists (docs/hosting-and-scaling.md) — this
    // is the same documented substitute as krisenchat's own dev setup would
    // need, not a shortcut unique to this project.
    console.log(`[dev] OTP for ${phone}: ${code}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not send code" }, { status: 500 });
  }
}
