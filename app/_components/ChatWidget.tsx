"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatTranscript } from "./ChatTranscript";
import { useChatWidget } from "./ChatWidgetContext";
import type { ChatState } from "@/lib/queue";
import { mergeMessages, type ChatMessage } from "@/lib/chat-client";
import { playSentSound, playReceivedSound } from "@/lib/chat-sounds";

const POLL_INTERVAL_MS = 20_000;
const TYPING_IDLE_MS = 3_000;

// Only one Listener exists right now (the seeded admin, "Menty B"), so
// naming them directly in the confirmation copy is simpler and more honest
// than a generic "a Listener" — revisit once a second Listener account
// exists and "sent to Menty B" stops being universally true.
const LISTENER_NAME = "Menty B";

// Fixed bottom-right widget. The round trigger is always mounted (even
// before a chat exists) — restyled onto the same neo-brutalist system
// (`.nb`) as the Listener/admin dashboard's chat panels, replacing the old
// soft rounded-card look so the two chat surfaces read as one system.
export function ChatWidget({
  initial,
  initialDisplayName,
}: {
  initial: ChatState;
  initialDisplayName: string | null;
}) {
  const { open, openWidget, closeWidget } = useChatWidget();
  const [chatState, setChatState] = useState<ChatState>(initial);
  // Never a standalone prop: the widget's initial server render happens
  // before StartChat's POST /api/chat/start has created anything, so a
  // sessionId prop would be frozen at null for the rest of the session
  // (client-side fetches don't trigger a server re-render). chatState is
  // the only value that's actually kept fresh by refreshState(), so it's
  // the only place sessionId can safely come from.
  const sessionId = chatState.kind !== "none" ? chatState.sessionId : null;
  // Welcome + name step, shown once per chat. Starts already dismissed if
  // there's an existing session at page load (returning visitor reopening
  // the widget), since they've already been through it.
  const [introDismissed, setIntroDismissed] = useState(initial.kind !== "none");
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [nameInput, setNameInput] = useState(initialDisplayName ?? "");
  const [listenerTyping, setListenerTyping] = useState(false);

  const fetchingStateRef = useRef(false);
  const messagesLoadedRef = useRef(false);
  const lastSequenceRef = useRef(0);
  const hasConnectedBeforeRef = useRef(false);
  const chatChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refreshState() {
    if (fetchingStateRef.current) return;
    fetchingStateRef.current = true;
    try {
      const res = await fetch("/api/chat/state");
      setChatState(res.ok ? ((await res.json()) as ChatState) : { kind: "none" });
    } finally {
      fetchingStateRef.current = false;
    }
  }

  async function fetchMessages(since?: number) {
    if (!sessionId) return;
    const url =
      since !== undefined
        ? `/api/chat/${sessionId}/messages?since=${since}`
        : `/api/chat/${sessionId}/messages`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as { messages: ChatMessage[] };
    setMessages((prev) => mergeMessages(prev, data.messages));
    for (const m of data.messages) {
      lastSequenceRef.current = Math.max(lastSequenceRef.current, m.sequence);
    }
  }

  // Load the transcript once there's an actual session to load it for —
  // covers both "returning visitor reopens the widget" and "just finished
  // the welcome step and created one."
  useEffect(() => {
    if (sessionId && !messagesLoadedRef.current) {
      messagesLoadedRef.current = true;
      void fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Keep the transcript pinned to the latest message/typing indicator,
  // same as WhatsApp/Intercom-style widgets — otherwise a new bubble's
  // pop-in animation can land below the visible scroll area unnoticed.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, listenerTyping]);

  useEffect(() => {
    if (chatState.kind === "none" || !sessionId) return;

    const poll = setInterval(refreshState, POLL_INTERVAL_MS);
    // authParams travels with every token request this client makes,
    // including silent renewals — the token route re-verifies `role` against
    // this specific chat server-side every time, not just once at connect
    // (see app/api/ably/token/route.ts). role:"visitor" also sets this
    // connection's clientId to "visitor", which is how the presence
    // handler below tells "me" from "the Listener."
    const ably = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authParams: { chatId: sessionId, role: "visitor" },
    });

    const queueChannel = ably.channels.get("queue");
    const handleQueueUpdate = () => void refreshState();
    // subscribe() resolves once attached — in dev, React Strict Mode mounts
    // this effect twice, closing the first connection before it attaches.
    // That's an expected rejection, not a real failure; the poll above
    // covers us either way.
    queueChannel.subscribe("update", handleQueueUpdate).catch(() => {});

    const chatChannel = ably.channels.get(`chat:${sessionId}`);
    chatChannelRef.current = chatChannel;
    const handleChatMessage = (msg: Ably.Message) => {
      const payload = msg.data as ChatMessage;
      // Ably broadcasts to every subscriber including the sender, so a
      // visitor-sent message echoes back here too — only sound for the
      // other participant's messages, since the sender already got
      // playSentSound() at the moment they hit Send.
      if (payload.sender === "LISTENER") playReceivedSound();
      setMessages((prev) => mergeMessages(prev, [payload]));
      lastSequenceRef.current = Math.max(lastSequenceRef.current, payload.sequence);
    };
    chatChannel.subscribe("message", handleChatMessage).catch(() => {});

    // FR-5.4 (T4.5) — Ably presence, not a plain publish on the message
    // channel: presence is a distinct capability from publish (see the
    // token route), so a client can update its own typing state without
    // ever being able to inject a fake "message" event into the transcript.
    chatChannel.presence.enter({ typing: false }).catch(() => {});
    const refreshTypingState = async () => {
      try {
        const members = await chatChannel.presence.get();
        setListenerTyping(
          members.some((m) => m.clientId === "listener" && m.data?.typing === true),
        );
      } catch {
        // Presence read failing shouldn't break messaging — same
        // never-block-core-function posture as FR-6.3's classifier fallback.
      }
    };
    chatChannel.presence.subscribe(["enter", "update", "leave"], refreshTypingState).catch(() => {});

    // T4.3 — on reconnect (not the initial connect), resync anything sent
    // while the socket was down instead of trusting the gap didn't matter.
    const handleConnectionUpdate = (stateChange: Ably.ConnectionStateChange) => {
      if (stateChange.current !== "connected") return;
      if (!hasConnectedBeforeRef.current) {
        hasConnectedBeforeRef.current = true;
        return;
      }
      void refreshState();
      if (messagesLoadedRef.current) void fetchMessages(lastSequenceRef.current);
    };
    ably.connection.on("connected", handleConnectionUpdate);

    return () => {
      clearInterval(poll);
      queueChannel.unsubscribe("update", handleQueueUpdate);
      chatChannel.unsubscribe("message", handleChatMessage);
      chatChannel.presence.unsubscribe(refreshTypingState);
      chatChannel.presence.leave().catch(() => {});
      ably.connection.off("connected", handleConnectionUpdate);
      ably.close();
      chatChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState.kind !== "none", sessionId]);

  // The welcome step's "Start chatting": creates the session (idempotent —
  // safe even if StartChat's Hero CTA already opened the widget and one
  // exists), sets the chosen name if any, then lets the composer take over.
  async function handleStartChat() {
    setIntroDismissed(true);
    setStarting(true);
    try {
      const res = await fetch("/api/chat/start", { method: "POST" });
      if (!res.ok) throw new Error("start failed");
      const trimmed = nameInput.trim();
      if (trimmed) {
        await fetch("/api/chat/display-name", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: trimmed }),
        });
      }
      await refreshState();
    } finally {
      setStarting(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/chat/leave", { method: "POST" });
      if (!res.ok) throw new Error("leave failed");
      setChatState({ kind: "none" });
      setMessages([]);
      messagesLoadedRef.current = false;
      lastSequenceRef.current = 0;
      setIntroDismissed(false);
      setNameInput("");
    } finally {
      setLeaving(false);
    }
  }

  // Presence "typing" state is set true immediately, then cleared after a
  // few seconds of no further input — the same idle-timeout shape every
  // chat product uses, since there's no "stopped typing" DOM event to hook.
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
    if (!sessionId || !body) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    chatChannelRef.current?.presence.update({ typing: false }).catch(() => {});
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${sessionId}/messages`, {
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
    <>
      {/* Always mounted (not conditionally rendered) so open/close is a
          two-way CSS transition — scale+fade anchored at the corner it
          expands from — instead of an instant swap with only an entrance
          animation on one side. Always visible regardless of chat state,
          not just once a chat exists. */}
      <button
        onClick={openWidget}
        aria-label="Reopen chat"
        aria-hidden={open}
        inert={open}
        className={`nb-pill nb-press fixed bottom-20 right-4 z-40 flex h-14 w-14 origin-bottom-right items-center justify-center bg-ink text-bg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:bottom-24 sm:right-6 ${
          open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <ChatBubbleIcon />
        {listenerTyping && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg bg-accent" />
        )}
      </button>

      <div
        aria-hidden={!open}
        inert={!open}
        className={`nb fixed bottom-20 right-4 z-40 flex w-[22rem] max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden bg-surface transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:bottom-24 sm:right-6 sm:max-w-[calc(100vw-3rem)] ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-0 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-3">
          {/* Who you're chatting with, on top — same treatment as the
              visitor's name atop each panel in the admin dashboard. */}
          <span className="font-display text-sm text-bg">{LISTENER_NAME}</span>
          <button
            onClick={closeWidget}
            aria-label="Minimize chat"
            className="text-bg/70 transition hover:text-bg"
          >
            <MinimizeIcon />
          </button>
        </div>

        {!introDismissed ? (
          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-sm text-ink">
              Hey — glad you&apos;re here. This is a safe space to get it off your chest. No
              judgment, no signup.
            </p>
            <label className="flex flex-col gap-1 text-xs text-ink/70">
              What should we call you?
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Anonymous"
                maxLength={40}
                aria-label="Your display name"
                className="w-full rounded-full border border-border bg-bg px-3 py-1.5 text-sm text-ink placeholder:text-ink/50"
              />
            </label>
            <button
              onClick={handleStartChat}
              disabled={starting}
              className="nb-pill nb-press bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "One sec…" : "Start chatting"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-4">
            <ChatTranscript
              messages={messages}
              selfSender="VISITOR"
              visitorName={nameInput.trim() || "Anonymous"}
              listenerName={LISTENER_NAME}
              isOtherTyping={listenerTyping}
              emptyText="Type whatever's going on — we're listening."
              scrollRef={scrollRef}
              className="max-h-64 min-h-[6rem]"
              footer={
                chatState.kind === "waiting" && messages.length > 0 && !listenerTyping ? (
                  <p className="text-center text-xs text-ink/70">
                    Sent to {LISTENER_NAME} — they&apos;ll jump in soon.
                  </p>
                ) : null
              }
            />

            {sessionId ? (
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  value={messageBody}
                  onChange={(e) => handleMessageBodyChange(e.target.value)}
                  placeholder="Type a message…"
                  aria-label="Type a message"
                  maxLength={4000}
                  className="w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink placeholder:text-ink/50"
                />
                <button
                  type="submit"
                  disabled={sending || !messageBody.trim()}
                  className="nb-pill nb-press bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            ) : (
              <input
                disabled
                placeholder="Setting things up…"
                aria-label="Message input, setting up your chat"
                className="w-full rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/50 placeholder:text-ink/50"
              />
            )}

            <button
              onClick={handleLeave}
              disabled={leaving}
              className="self-center text-xs text-ink/70 underline underline-offset-2 transition hover:text-ink disabled:opacity-60"
            >
              {leaving ? "Leaving…" : "End chat"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h16v12H8l-4 4V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
