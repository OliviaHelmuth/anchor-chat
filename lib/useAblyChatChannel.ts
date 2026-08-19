"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState } from "react";
import { mergeMessages, type ChatMessage } from "@/lib/chat-client";

const TYPING_IDLE_MS = 3_000;

type Role = "visitor" | "listener";

const FETCH_URL: Record<Role, (chatId: string) => string> = {
  visitor: (chatId) => `/api/chat/${chatId}/messages`,
  listener: (chatId) => `/api/listener/chat/${chatId}/messages`,
};

// The other participant — used both to decide which incoming messages fire
// onOtherMessage and to read their typing state off presence. role sets
// this connection's own clientId server-side (see app/api/ably/token/route.ts),
// which is how presence tells "me" from "them."
const OTHER_CLIENT_ID: Record<Role, string> = {
  visitor: "listener",
  listener: "visitor",
};
const OTHER_SENDER: Record<Role, ChatMessage["sender"]> = {
  visitor: "LISTENER",
  listener: "VISITOR",
};

// Owns the chat:{chatId} channel's whole lifecycle — connect, message
// subscribe (with dedupe/resequence via mergeMessages), presence-based
// typing, reconnect-resync, and cleanup — for both ChatWidget (visitor) and
// ListenerChat (listener), which previously duplicated this near line-for-line.
//
// Exposes the underlying Ably client, not just the chat channel: a caller
// that needs another channel on this connection (ChatWidget's "queue"
// channel) must reuse this connection rather than open a second one —
// Ably's free tier caps concurrent connections (see
// docs/hosting-and-scaling.md), so one visitor tab opening two would halve
// effective capacity under that cap.
export function useAblyChatChannel(
  chatId: string | null,
  role: Role,
  handlers?: {
    // Extra per-caller resync beyond messages, which this hook always
    // refetches itself on reconnect — e.g. ChatWidget also refreshes its
    // chatState.
    onReconnect?: () => void;
    // Fired after merging in a message from the other participant; callers
    // own their own sound/notification side effects here.
    onOtherMessage?: (message: ChatMessage) => void;
  },
) {
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);

  const lastSequenceRef = useRef(0);
  const hasConnectedBeforeRef = useRef(false);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read from inside the connect effect, which only depends on
  // [chatId, role] — a ref keeps the effect from having to reconnect just
  // because a caller passed a new handlers object on some unrelated render.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  function addMessages(incoming: ChatMessage[]) {
    setMessages((prev) => mergeMessages(prev, incoming));
    for (const m of incoming) {
      lastSequenceRef.current = Math.max(lastSequenceRef.current, m.sequence);
    }
  }

  async function fetchSince(chat: string, since?: number) {
    const base = FETCH_URL[role](chat);
    const url = since !== undefined ? `${base}?since=${since}` : base;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[] };
    addMessages(data.messages);
  }

  useEffect(() => {
    if (!chatId) {
      // No chat to hold state for (e.g. the visitor just left) — start the
      // next connection from a clean slate rather than carrying over a
      // previous chat's messages/sequence/reconnect-gate. Resetting on a
      // synchronized external value (chatId) going away, not a fetch-then-
      // setState — the "sync with an external system" case the lint rule's
      // own message permits (see ChatWidget's identical-shape exception).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      setOtherTyping(false);
      lastSequenceRef.current = 0;
      hasConnectedBeforeRef.current = false;
      return;
    }

    void fetchSince(chatId);

    const ably = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authParams: { chatId, role },
    });
    setClient(ably);

    const channel = ably.channels.get(`chat:${chatId}`);
    channelRef.current = channel;

    const handleMessage = (msg: Ably.Message) => {
      const payload = msg.data as ChatMessage;
      addMessages([payload]);
      if (payload.sender === OTHER_SENDER[role]) {
        handlersRef.current?.onOtherMessage?.(payload);
      }
    };
    channel.subscribe("message", handleMessage).catch(() => {});

    channel.presence.enter({ typing: false }).catch(() => {});
    const refreshTypingState = async () => {
      try {
        const members = await channel.presence.get();
        setOtherTyping(
          members.some((m) => m.clientId === OTHER_CLIENT_ID[role] && m.data?.typing === true),
        );
      } catch {
        // Presence read failing shouldn't break messaging.
      }
    };
    channel.presence.subscribe(["enter", "update", "leave"], refreshTypingState).catch(() => {});

    const handleConnectionUpdate = (stateChange: Ably.ConnectionStateChange) => {
      if (stateChange.current !== "connected") return;
      if (!hasConnectedBeforeRef.current) {
        hasConnectedBeforeRef.current = true;
        return;
      }
      void fetchSince(chatId, lastSequenceRef.current);
      handlersRef.current?.onReconnect?.();
    };
    ably.connection.on("connected", handleConnectionUpdate);

    return () => {
      channel.unsubscribe("message", handleMessage);
      channel.presence.unsubscribe(refreshTypingState);
      channel.presence.leave().catch(() => {});
      ably.connection.off("connected", handleConnectionUpdate);
      ably.close();
      setClient(null);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, role]);

  function notifyTyping() {
    const channel = channelRef.current;
    if (!channel) return;
    channel.presence.update({ typing: true }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.presence.update({ typing: false }).catch(() => {});
    }, TYPING_IDLE_MS);
  }

  function clearTyping() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channelRef.current?.presence.update({ typing: false }).catch(() => {});
  }

  return { client, messages, otherTyping, addMessages, notifyTyping, clearTyping };
}
