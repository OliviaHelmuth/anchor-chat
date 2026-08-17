import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { resolveVisitorChatAccess } from "@/lib/chat";
import { listMessages, sendMessage } from "@/lib/chat-messages";

// Visitor-only — ChatWidget's endpoint. lib/chat.ts's
// resolveVisitorChatAccess() never consults Listener identity, on purpose:
// see its comment for why a combined check would misattribute messages
// when one browser holds both a visitor cookie and a Listener session.
// GET supports ?since=<sequence> — the same endpoint backs both the initial
// message-list fetch and T4.3's reconnect resync.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVisitorChatAccess(id);
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

// A visitor can send as soon as they're in the queue, not only once a
// Listener has claimed — the widget now leads with "start venting" rather
// than a waiting screen, so the first message needs somewhere to land right
// away. It's stored and broadcast on chat:{id} either way; a Listener who
// hasn't claimed yet just isn't subscribed to that channel until they do,
// and picks up anything sent before then via the normal history fetch on
// claim (ListenerChat fetches its own history on mount).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveVisitorChatAccess(id);
    if (!access) {
      return NextResponse.json({ error: "Not authorized for this chat" }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const body = typeof json?.body === "string" ? json.body.trim() : "";
    if (!body || body.length > 4000) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const message = await sendMessage(id, "VISITOR", body);
    return NextResponse.json({ message });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
