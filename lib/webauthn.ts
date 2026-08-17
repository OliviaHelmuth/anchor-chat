/**
 * WebAuthn's relying-party ID must equal the domain the browser is actually
 * on, so it's derived per-request rather than hardcoded — this is what lets
 * the same code work against localhost in dev and the real Vercel domain in
 * production with no config. The one real constraint this creates: a
 * passkey registered on one origin (e.g. a preview-deploy URL) will not
 * verify on another (e.g. the stable production alias) — WebAuthn ties a
 * credential to the exact rpID it was created under. Always test against
 * the same origin you'll actually demo from.
 */
export function getRpConfig(request: Request) {
  const url = new URL(request.url);
  return {
    rpID: url.hostname,
    rpName: "overshare.io",
    origin: url.origin,
  };
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return Buffer.from(publicKey).toString("base64");
}

export function base64ToPublicKey(encoded: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(encoded, "base64"));
}
