import { describe, expect, it } from "vitest";
import { mergeMessages, type ChatMessage } from "@/lib/chat-client";

function msg(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "m1",
    sender: "VISITOR",
    body: "hi",
    sequence: 1,
    createdAt: "2026-08-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("mergeMessages", () => {
  it("appends new messages and sorts by sequence", () => {
    const prev = [msg({ id: "a", sequence: 1 })];
    const incoming = [msg({ id: "b", sequence: 2 })];
    expect(mergeMessages(prev, incoming).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("dedupes by id — a message arriving twice (POST response + Ably echo) counts once", () => {
    const prev = [msg({ id: "a", sequence: 1, body: "first" })];
    const incoming = [msg({ id: "a", sequence: 1, body: "first" })];
    const result = mergeMessages(prev, incoming);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("sorts strictly by server-assigned sequence, not arrival order", () => {
    const prev = [msg({ id: "b", sequence: 2 })];
    const incoming = [msg({ id: "a", sequence: 1 })];
    expect(mergeMessages(prev, incoming).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("an incoming message with the same id overwrites the previous copy", () => {
    const prev = [msg({ id: "a", sequence: 1, body: "stale" })];
    const incoming = [msg({ id: "a", sequence: 1, body: "updated" })];
    expect(mergeMessages(prev, incoming)[0].body).toBe("updated");
  });

  it("handles an empty incoming list", () => {
    const prev = [msg({ id: "a" })];
    expect(mergeMessages(prev, [])).toEqual(prev);
  });
});
