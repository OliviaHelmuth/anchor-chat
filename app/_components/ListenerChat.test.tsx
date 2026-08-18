import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListenerChat } from "./ListenerChat";
import { I18nProvider } from "@/lib/i18n";
import type { ChatMessage } from "@/lib/chat-client";

vi.mock("ably", async () => {
  const { MockAblyRealtime } = await import("./test-helpers/ably-mock");
  return { Realtime: MockAblyRealtime };
});

function renderListenerChat() {
  return render(
    <I18nProvider>
      <ListenerChat sessionId="sess-1" visitorName="River" listenerName="Menty B" />
    </I18nProvider>,
  );
}

describe("ListenerChat", () => {
  let history: ChatMessage[];

  beforeEach(() => {
    window.localStorage.setItem("anchor_locale", "en");
    history = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.startsWith("/api/listener/chat/sess-1/messages") && method === "GET") {
          return new Response(JSON.stringify({ messages: history }), { status: 200 });
        }
        if (url === "/api/listener/chat/sess-1/messages" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as { body: string };
          const message: ChatMessage = {
            id: `m${history.length + 1}`,
            sender: "LISTENER",
            body: body.body,
            sequence: history.length + 1,
            createdAt: new Date().toISOString(),
          };
          history = [...history, message];
          return new Response(JSON.stringify({ message }), { status: 200 });
        }
        throw new Error(`Unexpected fetch in test: ${method} ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("fetches and renders message history on mount", async () => {
    history = [
      {
        id: "m0",
        sender: "VISITOR",
        body: "hey, is anyone there?",
        sequence: 1,
        createdAt: new Date().toISOString(),
      },
    ];
    renderListenerChat();

    await waitFor(() => {
      expect(screen.getByText("hey, is anyone there?")).toBeInTheDocument();
    });
  });

  it("shows the empty state before any messages exist", async () => {
    renderListenerChat();
    await waitFor(() => {
      expect(screen.getByText("No messages yet.")).toBeInTheDocument();
    });
  });

  it("sends a message and appends it to the transcript", async () => {
    const user = userEvent.setup();
    renderListenerChat();

    await user.type(screen.getByLabelText("Type a message…"), "Hey River, I'm here.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(screen.getByText("Hey River, I'm here.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Type a message…")).toHaveValue("");
  });
});
