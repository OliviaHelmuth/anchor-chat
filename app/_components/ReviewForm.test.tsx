import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewForm } from "./ReviewForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ReviewForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a review and clears the field on success", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    render(<ReviewForm listenerId="listener-1" />);

    await user.type(screen.getByLabelText("Leave a peer review"), "Really thoughtful, great listener.");
    await user.click(screen.getByRole("button", { name: "Post review" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Leave a peer review")).toHaveValue("");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/listeners/listener-1/reviews",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ body: "Really thoughtful, great listener." }),
      }),
    );
  });

  it("shows an error and keeps the text when submission fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Can't review your own profile" }), { status: 400 }),
    );
    const user = userEvent.setup();
    render(<ReviewForm listenerId="listener-1" />);

    await user.type(screen.getByLabelText("Leave a peer review"), "Trying to review myself.");
    await user.click(screen.getByRole("button", { name: "Post review" }));

    await waitFor(() => {
      expect(screen.getByText("Can't review your own profile")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Leave a peer review")).toHaveValue("Trying to review myself.");
  });
});
