import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchiveList } from "./ArchiveList";
import { I18nProvider } from "@/lib/i18n";
import type { OngoingSession } from "@/lib/queue";

function renderList(sessions: OngoingSession[]) {
  return render(
    <I18nProvider>
      <ArchiveList sessions={sessions} />
    </I18nProvider>,
  );
}

describe("ArchiveList", () => {
  beforeEach(() => {
    window.localStorage.setItem("anchor_locale", "en");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows the empty state when nothing has been archived", () => {
    renderList([]);
    expect(screen.getByText("Nothing archived yet.")).toBeInTheDocument();
  });

  it("renders an archived session's visitor name and who claimed it", () => {
    renderList([
      {
        sessionId: "sess-1",
        displayName: "River",
        claimedAt: new Date("2026-01-01"),
        listenerDisplayName: "Menty B",
        lastMessageAt: new Date("2026-01-02"),
        lastVisitorMessageAt: null,
        lastListenerMessageAt: null,
        visitorLastSeenAt: null,
      },
    ]);
    expect(screen.getByText("River")).toBeInTheDocument();
    expect(screen.getByText(/Menty B/)).toBeInTheDocument();
  });

  it("falls back to 'Anonymous' when the visitor never set a name", () => {
    renderList([
      {
        sessionId: "sess-2",
        displayName: null,
        claimedAt: new Date("2026-01-01"),
        listenerDisplayName: "Menty B",
        lastMessageAt: null,
        lastVisitorMessageAt: null,
        lastListenerMessageAt: null,
        visitorLastSeenAt: null,
      },
    ]);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });
});
