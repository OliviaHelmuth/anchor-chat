import { vi } from "vitest";

// A controllable Ably double for testing useAblyChatChannel's own wiring —
// unlike app/_components/test-helpers/ably-mock.ts's no-op stub (fine for
// component tests that don't touch realtime behavior), this one lets a test
// fire subscribed handlers and connection events directly, so reconnect
// ordering / presence-derived typing / dedupe can actually be exercised.
//
// Usage in a test file (vi.mock's factory can't close over top-level
// imports directly, hence the dynamic import inside it):
//
//   vi.mock("ably", async () => {
//     const { FakeAblyRealtime } = await import("@/lib/test-helpers/ably-fake");
//     return { Realtime: FakeAblyRealtime };
//   });
export class FakeAblyChannel {
  private listeners = new Map<string, Set<(msg: unknown) => void>>();
  presenceMembers: { clientId: string; data?: unknown }[] = [];
  private presenceListeners = new Set<() => void>();

  presence = {
    enter: vi.fn(() => Promise.resolve(undefined)),
    update: vi.fn(() => Promise.resolve(undefined)),
    get: vi.fn(() => Promise.resolve(this.presenceMembers)),
    subscribe: vi.fn((_events: string[], handler: () => void) => {
      this.presenceListeners.add(handler);
      return Promise.resolve(undefined);
    }),
    unsubscribe: vi.fn((handler?: () => void) => {
      if (handler) this.presenceListeners.delete(handler);
    }),
    leave: vi.fn(() => Promise.resolve(undefined)),
  };

  subscribe(event: string, handler: (msg: unknown) => void) {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return Promise.resolve(undefined);
  }

  unsubscribe(event: string, handler: (msg: unknown) => void) {
    this.listeners.get(event)?.delete(handler);
  }

  // Test-only: fire a message event as if it arrived over the wire.
  emitMessage(data: unknown) {
    for (const handler of this.listeners.get("message") ?? []) handler({ data });
  }

  // Test-only: fire presence members changing, notifying subscribers.
  setPresenceMembers(members: { clientId: string; data?: unknown }[]) {
    this.presenceMembers = members;
    for (const handler of this.presenceListeners) handler();
  }
}

export class FakeAblyRealtime {
  static instances: FakeAblyRealtime[] = [];

  authOptions: { authUrl?: string; authParams?: Record<string, string> };
  channelsByName = new Map<string, FakeAblyChannel>();
  channels = {
    get: (name: string) => {
      let channel = this.channelsByName.get(name);
      if (!channel) {
        channel = new FakeAblyChannel();
        this.channelsByName.set(name, channel);
      }
      return channel;
    },
    release: vi.fn(),
  };
  private connectionListeners = new Set<(change: { current: string }) => void>();
  connection = {
    on: (_event: string, handler: (change: { current: string }) => void) => {
      this.connectionListeners.add(handler);
    },
    off: (_event: string, handler: (change: { current: string }) => void) => {
      this.connectionListeners.delete(handler);
    },
  };
  close = vi.fn();

  constructor(authOptions: { authUrl?: string; authParams?: Record<string, string> }) {
    this.authOptions = authOptions;
    FakeAblyRealtime.instances.push(this);
  }

  // Test-only: fire a "connected" event on this connection.
  emitConnected() {
    for (const handler of this.connectionListeners) handler({ current: "connected" });
  }
}
