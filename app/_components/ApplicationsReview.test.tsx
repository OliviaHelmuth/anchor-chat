import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationsReview } from "./ApplicationsReview";
import { I18nProvider } from "@/lib/i18n";

const pendingApplication = {
  id: "app-1",
  name: "Test Applicant",
  email: "test-applicant@example.com",
  message: "I'd like to volunteer as a Listener.",
  status: "PENDING" as const,
  createdAt: new Date(),
};

function renderReview(initialPending = [pendingApplication], initialReviewed: typeof pendingApplication[] = []) {
  return render(
    <I18nProvider>
      <ApplicationsReview initialPending={initialPending} initialReviewed={initialReviewed} />
    </I18nProvider>,
  );
}

describe("ApplicationsReview", () => {
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

  it("shows the empty state when nothing is pending", () => {
    renderReview([]);
    expect(screen.getByText("Nothing waiting on review.")).toBeInTheDocument();
  });

  it("renders a pending application's details", () => {
    renderReview();
    expect(screen.getByText("Test Applicant")).toBeInTheDocument();
    expect(screen.getByText("test-applicant@example.com")).toBeInTheDocument();
    expect(screen.getByText("I'd like to volunteer as a Listener.")).toBeInTheDocument();
  });

  it("approving moves the application from pending to reviewed", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.queryByText("I'd like to volunteer as a Listener.")).not.toBeInTheDocument();
    });
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/app-1/approve", { method: "POST" });
  });

  it("rejecting moves the application to reviewed as REJECTED", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.getByText("REJECTED")).toBeInTheDocument();
    });
  });
});
