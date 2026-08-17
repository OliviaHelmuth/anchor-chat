"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { mergeMessages, type ChatMessage } from "@/lib/chat-client";
import { playSentSound, playReceivedSound } from "@/lib/chat-sounds";
import { useI18n } from "@/lib/i18n";
import { ChatTranscript } from "./ChatTranscript";

const TYPING_IDLE_MS = 3_000;

// Panels open dynamically now (claim, or reopening from the "ongoing
// chats" list — see AdminDashboard) rather than from one page's server
// render, so there's no server-fetched initialMessages to hand in; this
// fetches its own history on mount instead, same shape ChatWidget already
// uses for the visitor side.
export function ListenerChat({
  sessionId,
  visitorName,
  listenerName,
}: {
  sessionId: string;
  visitorName: string;
  listenerName: string;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);

  const lastSequenceRef = useRef(0);
  const hasConnectedBeforeRef = useRef(false);
  const chatChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function fetchMessagesSince(since?: number) {
    const url =
      since !== undefined
        ? `/api/listener/chat/${sessionId}/messages?since=${since}`
        : `/api/listener/chat/${sessionId}/messages`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[] };
    setMessages((prev) => mergeMessages(prev, data.messages));
    for (const m of data.messages) {
      lastSequenceRef.current = Math.max(lastSequenceRef.current, m.sequence);
    }
  }

  // Fetch-on-mount for whichever session this panel was opened for — the
  // standard "sync with an external system" case the lint rule's own
  // message permits; its static check just doesn't see through the async
  // function reference. See AdminDashboard's identical rationale.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessagesSince();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Keep the transcript pinned to the latest message/typing indicator —
  // same reasoning as ChatWidget's identical effect.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, visitorTyping]);

  useEffect(() => {
    // role:"listener" is verified server-side against this specific chat
    // (app/api/ably/token/route.ts) and sets this connection's clientId —
    // that's how the presence handler below tells "me" from the visitor.
    const ably = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authParams: { chatId: sessionId, role: "listener" },
    });
    const channel = ably.channels.get(`chat:${sessionId}`);
    chatChannelRef.current = channel;
    const handleMessage = (msg: Ably.Message) => {
      const payload = msg.data as ChatMessage;
      // Same reasoning as ChatWidget's handleChatMessage: Ably echoes the
      // Listener's own sent message back here too, so only sound for the
      // visitor's messages — the sender already heard playSentSound().
      if (payload.sender === "VISITOR") playReceivedSound();
      setMessages((prev) => mergeMessages(prev, [payload]));
      lastSequenceRef.current = Math.max(lastSequenceRef.current, payload.sequence);
    };
    channel.subscribe("message", handleMessage).catch(() => {});

    // FR-5.4 (T4.5) — same presence-based typing indicator as ChatWidget;
    // see that file's comment for why this is presence, not a publish.
    channel.presence.enter({ typing: false }).catch(() => {});
    const refreshTypingState = async () => {
      try {
        const members = await channel.presence.get();
        setVisitorTyping(
          members.some((m) => m.clientId === "visitor" && m.data?.typing === true),
        );
      } catch {
        // Presence read failing shouldn't break messaging.
      }
    };
    channel.presence.subscribe(["enter", "update", "leave"], refreshTypingState).catch(() => {});

    // T4.3 — same resync-on-reconnect pattern as ChatWidget.
    const handleConnectionUpdate = (stateChange: Ably.ConnectionStateChange) => {
      if (stateChange.current !== "connected") return;
      if (!hasConnectedBeforeRef.current) {
        hasConnectedBeforeRef.current = true;
        return;
      }
      void fetchMessagesSince(lastSequenceRef.current);
    };
    ably.connection.on("connected", handleConnectionUpdate);

    return () => {
      channel.unsubscribe("message", handleMessage);
      channel.presence.unsubscribe(refreshTypingState);
      channel.presence.leave().catch(() => {});
      ably.connection.off("connected", handleConnectionUpdate);
      ably.close();
      chatChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function handleMessageBodyChange(value: string) {
    setMessageBody(value);
    const channel = chatChannelRef.current;
    if (!channel) return;
    channel.presence.update({ typing: true }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.presence.update({ typing: false }).catch(() => {});
    }, TYPING_IDLE_MS);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = messageBody.trim();
    if (!body) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    chatChannelRef.current?.presence.update({ typing: false }).catch(() => {});
    setSending(true);
    try {
      const res = await fetch(`/api/listener/chat/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message: ChatMessage };
        playSentSound();
        setMessages((prev) => mergeMessages(prev, [data.message]));
        lastSequenceRef.current = Math.max(lastSequenceRef.current, data.message.sequence);
        setMessageBody("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="nb flex flex-col gap-3 bg-surface p-4">
      <ChatTranscript
        messages={messages}
        selfSender="LISTENER"
        visitorName={visitorName}
        listenerName={listenerName}
        isOtherTyping={visitorTyping}
        emptyText={t.admin.chat.noMessages}
        scrollRef={scrollRef}
        className="min-h-[16rem] max-h-[28rem]"
      />
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={messageBody}
          onChange={(e) => handleMessageBodyChange(e.target.value)}
          placeholder={t.admin.chat.typeMessage}
          aria-label={t.admin.chat.typeMessage}
          maxLength={4000}
          className="w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink placeholder:text-ink/50"
        />
        <button
          type="submit"
          disabled={sending || !messageBody.trim()}
          className="nb-pill nb-press bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t.admin.chat.send}
        </button>
      </form>
    </div>
  );
}
