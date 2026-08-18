import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BindIdentity } from "./BindIdentity";

// Currently unmounted from the live app (Milestone 4.98 — "for now"/hide,
// not delete), but the underlying logic is still real code worth covering.
// startRegistration/startAuthentication (@simplewebauthn/browser) need
// actual WebAuthn browser support jsdom doesn't have — these tests exercise
// the paths reachable without them (the email-link flow, and the passkey
// buttons' error handling when the options request itself fails), matching
// this repo's existing "handed off, not faked" posture for the real
// ceremony (see T2.7).
describe("BindIdentity", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts closed, offering email, passkey setup, and passkey sign-in", () => {
    render(<BindIdentity />);
    expect(screen.getByRole("button", { name: "Email me a link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up a passkey" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Already have a passkey for this site? Sign in" }),
    ).toBeInTheDocument();
  });

  it("reveals the email form when 'Email me a link' is clicked", async () => {
    const user = userEvent.setup();
    render(<BindIdentity />);

    await user.click(screen.getByRole("button", { name: "Email me a link" }));
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("shows the confirmation once the magic-link request succeeds", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();
    render(<BindIdentity />);

    await user.click(screen.getByRole("button", { name: "Email me a link" }));
    await user.type(screen.getByLabelText("Email address"), "visitor@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email for a sign-in link.")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/request-magic-link",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an error and stays on the form when the magic-link request fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }));
    const user = userEvent.setup();
    render(<BindIdentity />);

    await user.click(screen.getByRole("button", { name: "Email me a link" }));
    await user.type(screen.getByLabelText("Email address"), "visitor@example.com");
    await user.click(screen.getByRole("button", { name: "Send link" }));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't send that link/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("shows a graceful error if starting passkey registration fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "no session" }), { status: 400 }));
    const user = userEvent.setup();
    render(<BindIdentity />);

    await user.click(screen.getByRole("button", { name: "Set up a passkey" }));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't set up a passkey/)).toBeInTheDocument();
    });
  });
});
