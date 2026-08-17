import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { resolveListenerChatAccess } from "@/lib/chat";
import { listMessages, sendMessage } from "@/lib/chat-messages";

// Listener-only — ListenerChat's endpoint, mirroring
// app/api/chat/[id]/messages/route.ts but never consulting visitor
// identity. See lib/chat.ts's resolveVisitorChatAccess comment for why
// these are two routes instead of one that branches on role.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveListenerChatAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Not authorized for this chat" }, { status: 403 });
    }

    const sinceParam = request.nextUrl.searchParams.get("since");
    const since = sinceParam ? Number(sinceParam) : undefined;
    const messages = await listMessages(id, since);

    return NextResponse.json({ messages });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not load messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveListenerChatAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Not authorized for this chat" }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const body = typeof json?.body === "string" ? json.body.trim() : "";
    if (!body || body.length > 4000) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const message = await sendMessage(id, "LISTENER", body);
    return NextResponse.json({ message });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
