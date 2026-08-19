import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAblyChatChannel } from "./useAblyChatChannel";
import type { ChatMessage } from "./chat-client";

// Unlike the component tests (which stub Ably with a full no-op so realtime
// behavior never actually runs), this file exercises the hook's own wiring
// directly — reconnect-resync ordering, dedupe, other-role filtering, and
// typing debounce were previously only reachable through that no-op stub,
// so none of it was actually verified. See FakeAblyRealtime/FakeAblyChannel
// for what's controllable here.
vi.mock("ably", async () => {
  const { FakeAblyRealtime } = await import("./test-helpers/ably-fake");
  return { Realtime: FakeAblyRealtime };
});

// Imported after the mock so it resolves to the faked class.
const { FakeAblyRealtime } = await import("./test-helpers/ably-fake");

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "m1",
    sender: "VISITOR",
    body: "hey",
    sequence: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function stubFetch(extra?: (url: string) => Response | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const custom = extra?.(url);
      if (custom) return custom;
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }),
  );
}

describe("useAblyChatChannel", () => {
  beforeEach(() => {
    FakeAblyRealtime.instances.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("connects with role-derived auth params and fetches from the role-derived URL", async () => {
    stubFetch();
    renderHook(() => useAblyChatChannel("sess-1", "listener"));

    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    expect(FakeAblyRealtime.instances[0].authOptions.authParams).toEqual({
      chatId: "sess-1",
      role: "listener",
    });
    expect(fetch).toHaveBeenCalledWith("/api/listener/chat/sess-1/messages");
  });

  it("merges an incoming other-role message and fires onOtherMessage, but not for a same-role echo", async () => {
    stubFetch();
    const onOtherMessage = vi.fn();
    const { result } = renderHook(() =>
      useAblyChatChannel("sess-1", "visitor", { onOtherMessage }),
    );
    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    const channel = FakeAblyRealtime.instances[0].channels.get("chat:sess-1");

    act(() => {
      channel.emitMessage(message({ id: "listener-1", sender: "LISTENER", sequence: 2 }));
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(onOtherMessage).toHaveBeenCalledTimes(1);
    expect(onOtherMessage.mock.calls[0][0]).toMatchObject({ id: "listener-1" });

    act(() => {
      // The sender's own message echoing back over Ably (e.g. after a
      // REST-response merge already added it) — should not be treated as
      // "the other participant said something."
      channel.emitMessage(message({ id: "visitor-1", sender: "VISITOR", sequence: 3 }));
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(onOtherMessage).toHaveBeenCalledTimes(1);
  });

  it("dedupes repeated deliveries of the same message id", async () => {
    stubFetch();
    const { result } = renderHook(() => useAblyChatChannel("sess-1", "visitor"));
    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    const channel = FakeAblyRealtime.instances[0].channels.get("chat:sess-1");

    act(() => {
      channel.emitMessage(message({ id: "dup", sender: "LISTENER", sequence: 1 }));
      channel.emitMessage(message({ id: "dup", sender: "LISTENER", sequence: 1 }));
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
  });

  it("derives otherTyping from the other role's presence clientId", async () => {
    stubFetch();
    const { result } = renderHook(() => useAblyChatChannel("sess-1", "visitor"));
    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    const channel = FakeAblyRealtime.instances[0].channels.get("chat:sess-1");

    act(() => {
      channel.setPresenceMembers([{ clientId: "listener", data: { typing: true } }]);
    });
    await waitFor(() => expect(result.current.otherTyping).toBe(true));

    act(() => {
      // Presence from the caller's own role shouldn't count as "the other
      // party is typing," even if somehow present.
      channel.setPresenceMembers([{ clientId: "visitor", data: { typing: true } }]);
    });
    await waitFor(() => expect(result.current.otherTyping).toBe(false));
  });

  it("skips resync on the first connect, then resyncs and fires onReconnect on a real reconnect", async () => {
    stubFetch((url) => {
      if (url === "/api/chat/sess-1/messages") {
        return new Response(
          JSON.stringify({ messages: [message({ id: "seed", sequence: 5 })] }),
          { status: 200 },
        );
      }
      if (url === "/api/chat/sess-1/messages?since=5") {
        return new Response(
          JSON.stringify({ messages: [message({ id: "resynced", sender: "LISTENER", sequence: 6 })] }),
          { status: 200 },
        );
      }
      return null;
    });
    const onReconnect = vi.fn();
    const { result } = renderHook(() =>
      useAblyChatChannel("sess-1", "visitor", { onReconnect }),
    );
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(["seed"]));
    const realtime = FakeAblyRealtime.instances[0];

    act(() => {
      realtime.emitConnected(); // first-ever connect — not a reconnect
    });
    expect(onReconnect).not.toHaveBeenCalled();
    expect(result.current.messages.map((m) => m.id)).toEqual(["seed"]);

    act(() => {
      realtime.emitConnected(); // genuine reconnect
    });
    await waitFor(() =>
      expect(result.current.messages.map((m) => m.id)).toEqual(["seed", "resynced"]),
    );
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("notifyTyping sets presence typing true then clears it after the idle timeout; clearTyping clears it immediately", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubFetch();
    const { result } = renderHook(() => useAblyChatChannel("sess-1", "visitor"));
    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    const channel = FakeAblyRealtime.instances[0].channels.get("chat:sess-1");

    act(() => result.current.notifyTyping());
    expect(channel.presence.update).toHaveBeenLastCalledWith({ typing: true });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(channel.presence.update).toHaveBeenLastCalledWith({ typing: false });

    act(() => result.current.notifyTyping());
    expect(channel.presence.update).toHaveBeenLastCalledWith({ typing: true });
    act(() => result.current.clearTyping());
    expect(channel.presence.update).toHaveBeenLastCalledWith({ typing: false });

    const callsAfterClear = channel.presence.update.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    // clearTyping already cancelled the pending idle-timeout — advancing
    // past it shouldn't fire a second "stopped typing" update.
    expect(channel.presence.update.mock.calls.length).toBe(callsAfterClear);
  });

  it("resets messages and typing state when chatId goes away", async () => {
    stubFetch();
    const { result, rerender } = renderHook(
      ({ chatId }: { chatId: string | null }) => useAblyChatChannel(chatId, "visitor"),
      { initialProps: { chatId: "sess-1" as string | null } },
    );
    await waitFor(() => expect(FakeAblyRealtime.instances).toHaveLength(1));
    const channel = FakeAblyRealtime.instances[0].channels.get("chat:sess-1");
    act(() => {
      channel.emitMessage(message({ id: "before-leave", sender: "LISTENER" }));
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    rerender({ chatId: null });
    await waitFor(() => expect(result.current.messages).toHaveLength(0));
    expect(result.current.otherTyping).toBe(false);
  });
});
