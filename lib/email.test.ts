import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lib/email.ts reads BREVO_API_KEY/BREVO_SENDER_EMAIL into module-level
// consts at import time, not per call — so each case needs a fresh module
// instance (vi.resetModules + dynamic import) after setting process.env,
// not just reassigning process.env against an already-loaded module.
describe("lib/email.ts console-log fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("logs the magic-link URL instead of sending when Brevo isn't configured", async () => {
    process.env.BREVO_API_KEY = "";
    process.env.BREVO_SENDER_EMAIL = "";
    const fetchSpy = vi.spyOn(global, "fetch");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendMagicLinkEmail } = await import("@/lib/email");
    await sendMagicLinkEmail("visitor@example.com", "http://localhost:3000/auth/verify?token=abc");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[dev] Magic link for visitor@example.com: http://localhost:3000/auth/verify?token=abc",
      ),
    );
  });

  it("calls the real Brevo API and does not log when configured", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_SENDER_EMAIL = "sender@example.com";
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendMagicLinkEmail } = await import("@/lib/email");
    await sendMagicLinkEmail("visitor@example.com", "http://localhost:3000/auth/verify?token=abc");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({ method: "POST" }),
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs the Listener sign-in link too, not just the visitor magic link", async () => {
    process.env.BREVO_API_KEY = "";
    process.env.BREVO_SENDER_EMAIL = "";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendListenerLoginEmail } = await import("@/lib/email");
    await sendListenerLoginEmail(
      "menty@example.com",
      "http://localhost:3000/auth/verify?token=xyz&provider=listener-login",
    );

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[dev] Listener sign-in link for menty@example.com"),
    );
  });

  it("throws if Brevo is configured but the API call fails", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_SENDER_EMAIL = "sender@example.com";
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("server error", { status: 500 }));

    const { sendMagicLinkEmail } = await import("@/lib/email");
    await expect(
      sendMagicLinkEmail("visitor@example.com", "http://localhost:3000/auth/verify?token=abc"),
    ).rejects.toThrow(/Brevo send failed/);
  });
});
