import * as Sentry from "@sentry/nextjs";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { getRpConfig } from "@/lib/webauthn";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    // The requesting session only matters for challenge bookkeeping — this
    // is deliberately *not* how we figure out who's signing in. No
    // allowCredentials below means the browser's passkey picker can offer
    // any credential registered for this origin; auth.ts's passkeys
    // provider resolves identity from which credential was actually used,
    // same as krisenchat's own usernameless passkey flow presumably does.
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
    }

    const { rpID } = getRpConfig(request);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });

    const challenge = await prisma.passkeyChallenge.create({
      data: {
        challenge: options.challenge,
        sessionId,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    return NextResponse.json({ challengeId: challenge.id, options });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not start passkey sign-in" }, { status: 500 });
  }
}
