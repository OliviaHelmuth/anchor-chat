import { createHash, randomBytes, randomInt } from "crypto";

export function generateMagicLinkToken(): string {
  return randomBytes(32).toString("hex"); // 256 bits — unguessable
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * SHA-256 is fine for both token types here, for different reasons: the
 * magic-link token is high-entropy (brute force isn't feasible regardless
 * of hash speed), and the OTP code's real protection is the 5-attempt
 * lockout in auth.ts's otp provider, not hash cost. Neither is a
 * user-chosen password, so bcrypt/argon2's slow-hash property buys
 * nothing here.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
