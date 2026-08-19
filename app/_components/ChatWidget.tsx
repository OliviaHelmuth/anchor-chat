"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatTranscript } from "./ChatTranscript";
import { useChatWidget } from "./ChatWidgetContext";
import type { ChatState } from "@/lib/queue";
import type { ChatMessage } from "@/lib/chat-client";
import { useAblyChatChannel } from "@/lib/useAblyChatChannel";
import { playSentSound, playReceivedSound } from "@/lib/chat-sounds";
import { useUnreadTabNotifier } from "@/lib/useUnreadTabNotifier";

const POLL_INTERVAL_MS = 20_000;

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
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [nameInput, setNameInput] = useState(initialDisplayName ?? "");
  // In-app unread indicator, requested directly: a red badge on the round
  // trigger bubble while the widget is minimized, separate from
  // useUnreadTabNotifier's tab-level title/favicon badge (T4.7) — this one
  // is visible even if the visitor never looks away from the tab, just has
  // the panel minimized.
  const [unreadCount, setUnreadCount] = useState(0);
  // T4.7 — generic body, no message content, same posture as the AI
  // triage redaction and anonymous-by-default sessions elsewhere.
  const { notifyNewMessage, notifyPermission, desktopEnabled, toggleDesktopNotifications } =
    useUnreadTabNotifier("overshare.io", `New message from ${LISTENER_NAME}`);

  // Opening the widget is what "reading" the unread messages means here —
  // clear the moment it does, not on some other signal. Deriving from a
  // prop-like value (open) on change, not syncing with an external system
  // mid-render — same shape as the other set-state-in-effect exceptions
  // already established in this file/AdminDashboard.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setUnreadCount(0);
  }, [open]);

  // The Ably message handler below lives inside an effect keyed on
  // [chatState.kind !== "none", sessionId] — open/close doesn't retrigger
  // it, so reading `open` there directly would see a stale value from
  // whenever that effect last ran. A ref stays current across renders
  // without forcing a reconnect every time the widget opens or closes.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const fetchingStateRef = useRef(false);
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

  // Owns the chat:{sessionId} channel: connect, message subscribe/dedupe,
  // presence typing, reconnect-resync, cleanup — same module backs
  // ListenerChat's identical shape on the Listener side. `client` is the
  // shared Ably connection this hook opened, exposed so the queue-channel
  // effect below can reuse it instead of opening a second connection —
  // Ably's free tier caps concurrent connections (docs/hosting-and-scaling.md).
  const {
    client: ablyClient,
    messages,
    otherTyping: listenerTyping,
    addMessages,
    notifyTyping,
    clearTyping,
  } = useAblyChatChannel(sessionId, "visitor", {
    onReconnect: () => void refreshState(),
    onOtherMessage: () => {
      playReceivedSound();
      notifyNewMessage();
      if (!openRef.current) setUnreadCount((count) => count + 1);
    },
  });

  // Keep the transcript pinned to the latest message/typing indicator,
  // same as WhatsApp/Intercom-style widgets — otherwise a new bubble's
  // pop-in animation can land below the visible scroll area unnoticed.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, listenerTyping]);

  // FR-11.4 — a coarse "still here" signal for the admin dashboard's
  // online/last-online indicator, piggybacked on the existing poll
  // interval rather than a separate timer.
  useEffect(() => {
    if (chatState.kind === "none" || !sessionId) return;
    const poll = setInterval(() => {
      void refreshState();
      void fetch("/api/chat/heartbeat", { method: "POST" }).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState.kind !== "none", sessionId]);

  // The visitor's own chat-state can change from outside this tab (e.g. a
  // Listener claims it) — a push on the shared "queue" channel, same
  // connection the chat channel above already opened.
  useEffect(() => {
    if (!ablyClient) return;
    const queueChannel = ablyClient.channels.get("queue");
    const handleQueueUpdate = () => void refreshState();
    // subscribe() resolves once attached — in dev, React Strict Mode mounts
    // this effect twice, closing the first connection before it attaches.
    // That's an expected rejection, not a real failure; the poll above
    // covers us either way.
    queueChannel.subscribe("update", handleQueueUpdate).catch(() => {});
    return () => {
      queueChannel.unsubscribe("update", handleQueueUpdate);
    };
  }, [ablyClient]);

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
    notifyTyping();
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = messageBody.trim();
    if (!sessionId || !body) return;
    clearTyping();
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
        addMessages([data.message]);
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
        {!open && unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg bg-error-text px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : (
          listenerTyping &&
          !open && (
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg bg-accent" />
          )
        )}
        {unreadCount > 0 && !open && <span className="sr-only">{unreadCount} unread messages</span>}
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
          <div className="flex items-center gap-3">
            {notifyPermission !== "unsupported" && notifyPermission !== "denied" && (
              <button
                onClick={() => void toggleDesktopNotifications()}
                aria-label={
                  desktopEnabled ? "Turn off message notifications" : "Get notified about new messages"
                }
                aria-pressed={desktopEnabled}
                title={desktopEnabled ? "Notifications on" : "Get notified about new messages"}
                className={`transition hover:text-bg ${desktopEnabled ? "text-bg" : "text-bg/50"}`}
              >
                <BellIcon filled={desktopEnabled} />
              </button>
            )}
            <button
              onClick={closeWidget}
              aria-label="Minimize chat"
              className="text-bg/70 transition hover:text-bg"
            >
              <MinimizeIcon />
            </button>
          </div>
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

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 10a6 6 0 1 1 12 0c0 3.5 1.5 5 1.5 5h-15S6 13.5 6 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
