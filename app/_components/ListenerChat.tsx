"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/chat-client";
import { useAblyChatChannel } from "@/lib/useAblyChatChannel";
import { playSentSound, playReceivedSound } from "@/lib/chat-sounds";
import { useI18n } from "@/lib/i18n";
import { ChatTranscript } from "./ChatTranscript";

// Panels open dynamically now (claim, or reopening from the "ongoing
// chats" list — see AdminDashboard) rather than from one page's server
// render, so there's no server-fetched initialMessages to hand in;
// useAblyChatChannel fetches its own history on mount instead, same shape
// ChatWidget already uses for the visitor side.
export function ListenerChat({
  sessionId,
  visitorName,
  listenerName,
  onVisitorMessage,
}: {
  sessionId: string;
  visitorName: string;
  listenerName: string;
  // T4.7 — the unread tab notifier lives one level up in AdminDashboard
  // (it covers every open panel, not just this one), so a new visitor
  // message here just reports up rather than each panel keeping its own
  // notifier instance.
  onVisitorMessage?: () => void;
}) {
  const { t } = useI18n();
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    otherTyping: visitorTyping,
    addMessages,
    notifyTyping,
    clearTyping,
  } = useAblyChatChannel(sessionId, "listener", {
    onOtherMessage: () => {
      // Same reasoning as before: Ably echoes the Listener's own sent
      // message back too, so only sound/notify for the visitor's messages —
      // the sender already heard playSentSound().
      playReceivedSound();
      onVisitorMessage?.();
    },
  });

  // Keep the transcript pinned to the latest message/typing indicator —
  // same reasoning as ChatWidget's identical effect.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, visitorTyping]);

  function handleMessageBodyChange(value: string) {
    setMessageBody(value);
    notifyTyping();
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = messageBody.trim();
    if (!body) return;
    clearTyping();
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
        addMessages([data.message]);
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
