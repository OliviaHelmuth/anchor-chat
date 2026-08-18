import { vi } from "vitest";

// Shared by every component test that renders something holding a live
// Ably connection (ChatWidget, ListenerChat, AdminDashboard) — none of
// those tests' assertions touch realtime behavior, so every call is a
// no-op stub instead of a real websocket connection.
//
// Usage in a test file (vi.mock's factory can't close over top-level
// imports directly, hence the dynamic import inside it):
//
//   vi.mock("ably", async () => {
//     const { MockAblyRealtime } = await import("./test-helpers/ably-mock");
//     return { Realtime: MockAblyRealtime };
//   });
export class MockAblyChannel {
  subscribe = vi.fn(() => Promise.resolve(undefined));
  unsubscribe = vi.fn();
  presence = {
    enter: vi.fn(() => Promise.resolve(undefined)),
    subscribe: vi.fn(() => Promise.resolve(undefined)),
    unsubscribe: vi.fn(),
    leave: vi.fn(() => Promise.resolve(undefined)),
    get: vi.fn(() => Promise.resolve([])),
    update: vi.fn(() => Promise.resolve(undefined)),
  };
}

export class MockAblyRealtime {
  channels = { get: vi.fn(() => new MockAblyChannel()), release: vi.fn() };
  connection = { on: vi.fn(), off: vi.fn() };
  // AdminDashboard's presence-sync effect re-authorizes before subscribing
  // a newly-claimed chat (see its own comment on why — a real Ably
  // capability nuance found live in T5.7).
  auth = { authorize: vi.fn(() => Promise.resolve({})) };
  close = vi.fn();
}
