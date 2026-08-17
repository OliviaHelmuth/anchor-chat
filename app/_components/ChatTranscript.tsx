"use client";

import type { RefObject, ReactNode } from "react";
import { TypingDots } from "./TypingDots";
import type { ChatMessage } from "@/lib/chat-client";

// Small initials badge above each bubble — colored to match the bubble it
// sits above (accent for "self," bg for "other") so the name/avatar row and
// the message below it read as one unit.
function Avatar({ name, self }: { name: string; self: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink text-[10px] font-bold ${
        self ? "bg-accent text-accent-ink" : "bg-bg text-ink"
      }`}
    >
      {initial}
    </span>
  );
}

// Shared by ChatWidget (visitor) and ListenerChat (Listener) so both chat
// surfaces render an identical transcript — same bubble shape, same
// name+avatar row above each message — instead of each maintaining its own
// copy of the same markup. `selfSender` is the only thing that differs per
// viewer: each side sees its own messages on the right, the other's on the
// left, mirrored.
export function ChatTranscript({
  messages,
  selfSender,
  visitorName,
  listenerName,
  isOtherTyping,
  emptyText,
  scrollRef,
  className = "",
  footer,
}: {
  messages: ChatMessage[];
  selfSender: "VISITOR" | "LISTENER";
  visitorName: string;
  listenerName: string;
  isOtherTyping: boolean;
  emptyText: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  className?: string;
  footer?: ReactNode;
}) {
  function nameFor(sender: "VISITOR" | "LISTENER"): string {
    return sender === "VISITOR" ? visitorName : listenerName;
  }

  return (
    <div ref={scrollRef} className={`flex flex-col gap-3 overflow-y-auto ${className}`}>
      {messages.length === 0 && !isOtherTyping && (
        <p className="text-center text-xs text-ink/70">{emptyText}</p>
      )}
      {messages.map((m) => {
        const self = m.sender === selfSender;
        const name = nameFor(m.sender);
        return (
          <div
            key={m.id}
            className={`flex max-w-[85%] flex-col gap-1 ${self ? "self-end items-end" : "self-start items-start"}`}
          >
            <div className={`flex items-center gap-1.5 text-[11px] text-ink/70 ${self ? "flex-row-reverse" : ""}`}>
              <Avatar name={name} self={self} />
              <span>{name}</span>
            </div>
            <div
              className={
                self
                  ? "animate-message-in rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-ink"
                  : "animate-message-in rounded-2xl rounded-bl-sm bg-bg px-3 py-2 text-sm"
              }
            >
              {m.body}
            </div>
          </div>
        );
      })}
      {footer}
      {isOtherTyping && <TypingDots />}
    </div>
  );
}
