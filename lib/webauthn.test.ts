import { describe, expect, it } from "vitest";
import { base64ToPublicKey, getRpConfig, publicKeyToBase64 } from "@/lib/webauthn";

describe("getRpConfig", () => {
  it("derives rpID/origin from the request's own URL, not a hardcoded value", () => {
    const config = getRpConfig(new Request("https://overshare.example/api/auth/passkey/register-options"));
    expect(config).toEqual({
      rpID: "overshare.example",
      rpName: "overshare.io",
      origin: "https://overshare.example",
    });
  });

  it("works against localhost the same way, no special-casing needed", () => {
    const config = getRpConfig(new Request("http://localhost:3000/api/auth/passkey/auth-options"));
    expect(config.rpID).toBe("localhost");
    expect(config.origin).toBe("http://localhost:3000");
  });
});

describe("publicKeyToBase64 / base64ToPublicKey", () => {
  it("round-trips a public key through base64 unchanged", () => {
    const original = new Uint8Array([1, 2, 3, 250, 255, 0, 128]);
    const encoded = publicKeyToBase64(original);
    const decoded = base64ToPublicKey(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});
