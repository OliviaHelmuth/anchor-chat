import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMagicLinkToken, hashToken } from "@/lib/tokens";
import { sendListenerLoginEmail } from "@/lib/email";
import { isRateLimited } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 15 * 60 * 1000; // same TTL as the visitor magic link

function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(`listener-login:${clientKey(request)}`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }

    const listener = await prisma.listener.findUnique({ where: { email } });
    // Same response either way — a public form that reveals whether an
    // email belongs to a Listener is an enumeration leak, and unlike the
    // visitor flow there's no existing session that already proves intent.
    if (listener) {
      const rawToken = generateMagicLinkToken();
      await prisma.listenerLoginToken.create({
        data: {
          tokenHash: hashToken(rawToken),
          listenerId: listener.id,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const url = new URL("/auth/verify", request.url);
      url.searchParams.set("token", rawToken);
      url.searchParams.set("provider", "listener-login");
      await sendListenerLoginEmail(email, url.toString());
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not send link" }, { status: 500 });
  }
}
