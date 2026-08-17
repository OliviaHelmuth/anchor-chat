import * as Sentry from "@sentry/nextjs";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { getRpConfig } from "@/lib/webauthn";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const sessionId = await getSessionId();
    if (!sessionId) {
      return NextResponse.json({ error: "Start a chat first" }, { status: 400 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { email: true, phone: true },
    });
    const existing = await prisma.passkeyCredential.findMany({
      where: { sessionId },
      select: { credentialId: true },
    });

    const { rpID, rpName } = getRpConfig(request);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: session?.email ?? session?.phone ?? "overshare.io visitor",
      userID: Buffer.from(sessionId, "utf8"),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({ id: c.credentialId })),
      // "required" is what makes this usernameless: the credential is
      // discoverable, so sign-in never has to ask who you are first — the
      // OS's passkey picker itself is the identity lookup.
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
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
    return NextResponse.json({ error: "Could not start passkey registration" }, { status: 500 });
  }
}
