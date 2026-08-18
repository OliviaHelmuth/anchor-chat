import { describe, expect, it } from "vitest";
import { generateMagicLinkToken, generateOtpCode, hashToken } from "@/lib/tokens";

describe("generateMagicLinkToken", () => {
  it("produces a 64-char hex string (32 bytes)", () => {
    const token = generateMagicLinkToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is different across calls", () => {
    expect(generateMagicLinkToken()).not.toBe(generateMagicLinkToken());
  });
});

describe("generateOtpCode", () => {
  it("produces a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("abc123")).toBe(hashToken("abc123"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("abc123")).not.toBe(hashToken("abc124"));
  });

  it("produces a 64-char hex string (SHA-256)", () => {
    expect(hashToken("abc123")).toMatch(/^[0-9a-f]{64}$/);
  });
});
