import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatTranscript } from "./ChatTranscript";
import type { ChatMessage } from "@/lib/chat-client";

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

describe("ChatTranscript", () => {
  it("shows the empty-state text when there are no messages", () => {
    render(
      <ChatTranscript
        messages={[]}
        selfSender="VISITOR"
        visitorName="River"
        listenerName="Menty B"
        isOtherTyping={false}
        emptyText="Say something to get started."
        scrollRef={createRef<HTMLDivElement>()}
      />,
    );
    expect(screen.getByText("Say something to get started.")).toBeInTheDocument();
  });

  it("labels each message with the right name, regardless of which side is viewing", () => {
    render(
      <ChatTranscript
        messages={[
          msg({ id: "a", sender: "VISITOR", body: "hey there" }),
          msg({ id: "b", sender: "LISTENER", body: "hi, I'm here" }),
        ]}
        selfSender="LISTENER"
        visitorName="River"
        listenerName="Menty B"
        isOtherTyping={false}
        emptyText="empty"
        scrollRef={createRef<HTMLDivElement>()}
      />,
    );
    expect(screen.getByText("hey there")).toBeInTheDocument();
    expect(screen.getByText("hi, I'm here")).toBeInTheDocument();
    expect(screen.getAllByText("River")).toHaveLength(1);
    expect(screen.getAllByText("Menty B")).toHaveLength(1);
  });

  it("shows a typing indicator instead of the empty state when the other side is typing", () => {
    render(
      <ChatTranscript
        messages={[]}
        selfSender="VISITOR"
        visitorName="River"
        listenerName="Menty B"
        isOtherTyping
        emptyText="Say something to get started."
        scrollRef={createRef<HTMLDivElement>()}
      />,
    );
    expect(screen.queryByText("Say something to get started.")).not.toBeInTheDocument();
  });

  it("renders the optional footer after the messages", () => {
    render(
      <ChatTranscript
        messages={[msg({})]}
        selfSender="VISITOR"
        visitorName="River"
        listenerName="Menty B"
        isOtherTyping={false}
        emptyText="empty"
        scrollRef={createRef<HTMLDivElement>()}
        footer={<p>Sent to Menty B — they&apos;ll jump in soon.</p>}
      />,
    );
    expect(screen.getByText(/Sent to Menty B/)).toBeInTheDocument();
  });
});
