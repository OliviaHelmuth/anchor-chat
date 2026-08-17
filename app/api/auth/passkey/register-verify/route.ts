import * as Sentry from "@sentry/nextjs";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { getRpConfig, publicKeyToBase64 } from "@/lib/webauthn";

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const challengeId = body?.challengeId;
    const response = body?.response;
    if (typeof challengeId !== "string" || !response) {
      return NextResponse.json({ error: "Malformed request" }, { status: 400 });
    }

    const challenge = await prisma.passkeyChallenge.findUnique({ where: { id: challengeId } });
    if (
      !challenge ||
      challenge.sessionId !== sessionId ||
      challenge.usedAt ||
      challenge.expiresAt < new Date()
    ) {
      return NextResponse.json({ error: "Challenge expired, try again" }, { status: 400 });
    }
    await prisma.passkeyChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });

    const { rpID, origin } = getRpConfig(request);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Could not verify passkey" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;
    await prisma.passkeyCredential.create({
      data: {
        sessionId,
        credentialId: credential.id,
        publicKey: publicKeyToBase64(credential.publicKey),
        counter: credential.counter,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not save passkey" }, { status: 500 });
  }
}
