import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyForm } from "./ApplyForm";

describe("ApplyForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function fillOutForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Name"), "Robin");
    await user.type(screen.getByLabelText("Email"), "robin@example.com");
    await user.type(
      screen.getByLabelText("Why do you want to be a Listener?"),
      "I want to help people talk things through.",
    );
  }

  it("requires name, email, and message before it can be submitted", () => {
    render(<ApplyForm />);
    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Why do you want to be a Listener?")).toBeRequired();
  });

  it("shows a thank-you message after a successful submission", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    render(<ApplyForm />);

    await fillOutForm(user);
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => {
      expect(screen.getByText(/Menty B reviews every application personally/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/applications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Robin",
          email: "robin@example.com",
          message: "I want to help people talk things through.",
        }),
      }),
    );
  });

  it("shows an error and stays on the form when the request fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );
    const user = userEvent.setup();
    render(<ApplyForm />);

    await fillOutForm(user);
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    await waitFor(() => {
      expect(screen.getByText("Too many requests")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Submit application" })).toBeInTheDocument();
  });
});
