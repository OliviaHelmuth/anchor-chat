import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { ablyRest } from "@/lib/ably-server";

// Ably's token-auth pattern: the browser never sees ABLY_API_KEY, only a
// short-lived token scoped to exactly what it needs. Right now that's
// subscribe-only on "queue" — no publish, no other channels. Milestone 4
// (per-chat messaging) will extend the capability to that session's own
// chat:{id} channel, still never broadcast-wide.
export async function GET() {
  try {
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      capability: { queue: ["subscribe"] },
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not create Ably token" }, { status: 500 });
  }
}
