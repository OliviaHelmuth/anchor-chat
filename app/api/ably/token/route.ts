import * as Sentry from "@sentry/nextjs";
import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";
import { ablyRest } from "@/lib/ably-server";
import { resolveVisitorChatAccess, resolveListenerChatAccess } from "@/lib/chat";

// Ably's token-auth pattern: the browser never sees ABLY_API_KEY, only a
// short-lived token scoped to exactly what it needs. "queue" carries no
// personal data so every caller gets it. chat:{chatId} carries real message
// content plus presence (typing state), so both are only granted when the
// caller is verified for the *specific role it claims* — `role` is
// client-sent but never trusted on its own; it just selects which
// resolver checks it (mirrors why the message routes stayed split rather
// than one combined check — see lib/chat.ts). clientId is set to that same
// verified role so each side's Ably presence data can tell "me" from "the
// other participant" without another round trip.
export async function GET(request: NextRequest) {
  try {
    const capability: { [key: string]: Ably.capabilityOp[] } = { queue: ["subscribe"] };

    const chatId = request.nextUrl.searchParams.get("chatId");
    const role = request.nextUrl.searchParams.get("role");
    let clientId: string | undefined;

    if (chatId && role === "visitor" && (await resolveVisitorChatAccess(chatId))) {
      capability[`chat:${chatId}`] = ["subscribe", "presence"];
      clientId = "visitor";
    } else if (chatId && role === "listener" && (await resolveListenerChatAccess(chatId))) {
      capability[`chat:${chatId}`] = ["subscribe", "presence"];
      clientId = "listener";
    }

    const tokenRequest = await ablyRest.auth.createTokenRequest({ capability, clientId });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not create Ably token" }, { status: 500 });
  }
}
