import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminListenersPanel } from "./AdminListenersPanel";
import { I18nProvider } from "@/lib/i18n";

const admin = {
  id: "listener-admin",
  email: "menty-b@example.com",
  displayName: "Menty B",
  isAdmin: true,
  reviews: [],
};

const other = {
  id: "listener-other",
  email: "robin@example.com",
  displayName: "Robin",
  isAdmin: false,
  reviews: [{ id: "review-1", body: "Great to work with.", authorDisplayName: "Menty B" }],
};

function renderPanel(initial = [admin, other]) {
  return render(
    <I18nProvider>
      <AdminListenersPanel initial={initial} />
    </I18nProvider>,
  );
}

describe("AdminListenersPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.setItem("anchor_locale", "en");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("never shows a remove-listing button for the admin row", () => {
    renderPanel();
    const adminRow = screen.getByText("Menty B").closest("li")!;
    expect(within(adminRow).queryByText("Remove listing")).not.toBeInTheDocument();
  });

  it("shows a remove-listing button for a non-admin row", () => {
    renderPanel();
    const otherRow = screen.getByText("Robin").closest("li")!;
    expect(within(otherRow).getByText("Remove listing")).toBeInTheDocument();
  });

  it("removes a listener's listing after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText("Remove listing"));

    await waitFor(() => {
      expect(screen.queryByText("Robin")).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/listeners/listener-other", { method: "DELETE" });
  });

  it("does not call the API if the confirm dialog is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText("Remove listing"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Robin")).toBeInTheDocument();
  });

  it("removes an individual review", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText(/Great to work with/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(screen.queryByText(/Great to work with/)).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/reviews/review-1", { method: "DELETE" });
    // Removing the review doesn't remove the Listener's own listing.
    expect(screen.getByText("Robin")).toBeInTheDocument();
  });
});
