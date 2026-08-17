import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { generateMagicLinkToken, hashToken } from "@/lib/tokens";
import { sendMagicLinkEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 15 * 60 * 1000; // FR-2.2

function clientKey(request: Request): string {
  // No x-forwarded-for in local dev (no proxy in front) — falls back to a
  // shared key, which is fine there since it's a single developer testing,
  // not a real abuse surface. Vercel sets this header for real traffic.
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: Request) {
  try {
    // The actual spam vector docs/challenges/passwordless-auth.md calls
    // out — someone requesting hundreds of links to flood one inbox — so
    // the limit lives on the request step, not just the verify step.
    if (isRateLimited(`magic-link:${clientKey(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }

    const rawToken = generateMagicLinkToken();
    await prisma.magicLinkToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        email,
        sessionId,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const url = new URL("/auth/verify", request.url);
    url.searchParams.set("token", rawToken);
    await sendMagicLinkEmail(email, url.toString());

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not send link" }, { status: 500 });
  }
}
