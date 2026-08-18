import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWidget } from "./ChatWidget";
import { ChatWidgetProvider } from "./ChatWidgetContext";

// Ably would otherwise open a real websocket connection the moment the
// widget has a live chatState — none of this test's assertions touch
// realtime behavior, so every call is a no-op stub (app/_components/test-helpers/ably-mock.ts).
vi.mock("ably", async () => {
  const { MockAblyRealtime } = await import("./test-helpers/ably-mock");
  return { Realtime: MockAblyRealtime };
});

function renderWidget() {
  return render(
    <ChatWidgetProvider startOpen>
      <ChatWidget initial={{ kind: "none" }} initialDisplayName={null} />
    </ChatWidgetProvider>,
  );
}

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/chat/start" && method === "POST") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url === "/api/chat/display-name" && method === "PATCH") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (url === "/api/chat/state") {
          return new Response(
            JSON.stringify({ kind: "waiting", sessionId: "sess-1", position: 1, waitSeconds: 300 }),
            { status: 200 },
          );
        }
        if (url.startsWith("/api/chat/sess-1/messages")) {
          return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        }
        throw new Error(`Unexpected fetch in test: ${method} ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the welcome step before a chat exists", () => {
    renderWidget();
    expect(screen.getByLabelText("Your display name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start chatting" })).toBeInTheDocument();
  });

  it("dismisses the welcome step and enables the composer after starting a chat", async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.type(screen.getByLabelText("Your display name"), "River");
    await user.click(screen.getByRole("button", { name: "Start chatting" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Type a message")).toBeEnabled();
    });
    expect(screen.queryByRole("button", { name: "Start chatting" })).not.toBeInTheDocument();
  });
});
