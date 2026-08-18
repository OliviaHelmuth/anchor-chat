import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminDashboard } from "./AdminDashboard";
import { I18nProvider } from "@/lib/i18n";
import type { OngoingSession, QueueEntrySummary } from "@/lib/queue";

// Real websocket connections would otherwise open the moment the dashboard
// (and any open ListenerChat panel) mounts — see test-helpers/ably-mock.ts.
vi.mock("ably", async () => {
  const { MockAblyRealtime } = await import("./test-helpers/ably-mock");
  return { Realtime: MockAblyRealtime };
});

const queueEntry: QueueEntrySummary = {
  id: "qe-1",
  sessionId: "sess-1",
  position: 1,
  joinedAt: new Date(),
  displayName: "River",
};

const ongoingSession: OngoingSession = {
  sessionId: "sess-1",
  displayName: "River",
  claimedAt: new Date(),
  listenerDisplayName: "Menty B",
  lastMessageAt: null,
  lastVisitorMessageAt: null,
  lastListenerMessageAt: null,
  visitorLastSeenAt: null,
};

function renderDashboard(
  props: Partial<React.ComponentProps<typeof AdminDashboard>> = {},
) {
  return render(
    <I18nProvider>
      <AdminDashboard
        initialQueue={[queueEntry]}
        initialOngoing={[]}
        listenerDisplayName="Menty B"
        isAdmin
        {...props}
      />
    </I18nProvider>,
  );
}

describe("AdminDashboard", () => {
  beforeEach(() => {
    window.localStorage.setItem("anchor_locale", "en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/queue/qe-1/claim" && method === "POST") {
          return new Response(JSON.stringify({ ok: true, sessionId: "sess-1" }), { status: 200 });
        }
        if (url === "/api/queue") {
          return new Response(JSON.stringify({ entries: [] }), { status: 200 });
        }
        if (url === "/api/listener/sessions") {
          return new Response(JSON.stringify({ sessions: [ongoingSession] }), { status: 200 });
        }
        if (url.startsWith("/api/listener/chat/")) {
          return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        }
        throw new Error(`Unexpected fetch in test: ${method} ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows the waiting queue with a per-row claim button", () => {
    renderDashboard();
    expect(screen.getByText(/River/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Claim/ }).length).toBeGreaterThan(0);
  });

  it("shows empty states when nothing is waiting or claimed", () => {
    renderDashboard({ initialQueue: [] });
    expect(screen.getByText("Nobody's waiting right now.")).toBeInTheDocument();
    expect(screen.getByText("No claimed chats yet.")).toBeInTheDocument();
  });

  it("claims a queue entry and opens a chat panel for it", async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Two "Claim" buttons exist: the bulk-claim header button (disabled,
    // no rows selected) and the per-row one — click the enabled one.
    const claimButtons = screen.getAllByRole("button", { name: "Claim" });
    const rowClaimButton = claimButtons.find((button) => !(button as HTMLButtonElement).disabled);
    expect(rowClaimButton).toBeDefined();
    await user.click(rowClaimButton!);

    await waitFor(() => {
      expect(screen.getByLabelText("Type a message…")).toBeInTheDocument();
    });
  });

  it("lets sorting the ongoing-chat list by a different signal", async () => {
    const user = userEvent.setup();
    renderDashboard({ initialQueue: [], initialOngoing: [ongoingSession] });

    const select = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(select.value).toBe("lastOnline");
    await user.selectOptions(select, "Time you last answered");
    expect(select.value).toBe("lastAnswered");
  });

  it("opens a panel for an already-claimed chat from the ongoing list", async () => {
    const user = userEvent.setup();
    renderDashboard({ initialQueue: [], initialOngoing: [ongoingSession] });

    await user.click(screen.getByRole("button", { name: /River/ }));

    await waitFor(() => {
      expect(screen.getByLabelText("Type a message…")).toBeInTheDocument();
    });
  });
});
