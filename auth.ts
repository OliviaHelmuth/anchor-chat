import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { base64ToPublicKey, getRpConfig } from "@/lib/webauthn";

// Auth.js's default User/Session shape has no room for a phone number, and
// our "user" isn't really a User at all — it's the same anonymous Session
// row from Milestone 1, now with an email or phone bound to it. Extending
// the types here keeps that mapping explicit instead of casting to `any`
// at every call site.
declare module "next-auth" {
  interface User {
    phone?: string | null;
    isAdmin?: boolean;
  }
  interface Session {
    user: {
      // Optional, not `string`: a Listener-only session (see the
      // listener-login provider below) never gets a visitor sessionId —
      // the two identities are deliberately kept apart, see SessionToken.
      id?: string;
      email?: string | null;
      phone?: string | null;
      listenerId?: string;
      isAdmin?: boolean;
    };
  }
}

// Augmenting next-auth/jwt's ambient JWT type directly didn't resolve
// cleanly under this project's moduleResolution setting, so the jwt/session
// callbacks below cast to this instead — same effect, one place to look.
//
// sessionId and listenerId are deliberately separate fields, never shared:
// a Listener isn't a Session row at all (see prisma/schema.prisma), so
// letting a listener sign-in populate `sessionId` would make
// lib/session.ts's getSessionId() misread a Listener's id as a visitor
// Session id downstream.
type SessionToken = {
  sessionId?: string;
  email?: string | null;
  phone?: string | null;
  listenerId?: string;
  isAdmin?: boolean;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "magic-link",
      name: "Email link",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials): Promise<User | null> {
        const token = credentials?.token;
        if (typeof token !== "string" || !token) return null;

        const record = await prisma.magicLinkToken.findUnique({
          where: { tokenHash: hashToken(token) },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) return null;

        // Single-use (FR-2.3): marked used before anything else, so a
        // replayed request — or an email client's link-prefetch security
        // scanner beating the real click — can't verify twice.
        await prisma.magicLinkToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        return bindOrResumeByEmail(record.email, record.sessionId);
      },
    }),
    Credentials({
      id: "otp-sms-auth",
      name: "Phone code",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials): Promise<User | null> {
        const phone = credentials?.phone;
        const code = credentials?.code;
        if (typeof phone !== "string" || typeof code !== "string") return null;

        const record = await prisma.otpCode.findFirst({
          where: { phone, usedAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (!record || record.expiresAt < new Date() || record.attempts >= 5) return null;

        if (hashToken(code) !== record.codeHash) {
          await prisma.otpCode.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        await prisma.otpCode.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        return bindOrResumeByPhone(phone, record.sessionId);
      },
    }),
    Credentials({
      id: "passkeys",
      name: "Passkey",
      credentials: {
        challengeId: { label: "Challenge", type: "text" },
        response: { label: "Response", type: "text" },
      },
      async authorize(credentials, request): Promise<User | null> {
        const challengeId = credentials?.challengeId;
        const rawResponse = credentials?.response;
        if (typeof challengeId !== "string" || typeof rawResponse !== "string") return null;

        const challenge = await prisma.passkeyChallenge.findUnique({
          where: { id: challengeId },
        });
        if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) return null;
        await prisma.passkeyChallenge.update({
          where: { id: challenge.id },
          data: { usedAt: new Date() },
        });

        const response = JSON.parse(rawResponse);
        // Identity comes from *which* credential the browser's passkey
        // picker returned — never from the requesting session's cookie.
        // That's what makes this a real sign-in rather than just a local
        // confirmation: it works from a brand-new browser with no prior
        // cookie at all, exactly like the email/phone resume paths above.
        const credential = await prisma.passkeyCredential.findUnique({
          where: { credentialId: response.id },
        });
        if (!credential) return null;

        const { rpID, origin } = getRpConfig(request);
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge.challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: credential.credentialId,
            publicKey: base64ToPublicKey(credential.publicKey),
            counter: credential.counter,
          },
        });
        if (!verification.verified) return null;

        await prisma.passkeyCredential.update({
          where: { id: credential.id },
          data: { counter: verification.authenticationInfo.newCounter },
        });

        const session = await prisma.session.findUnique({ where: { id: credential.sessionId } });
        if (!session) return null;
        return { id: session.id, email: session.email, phone: session.phone };
      },
    }),
    // Milestone 3 (T3.2) — a Listener is a separate identity from a visitor
    // Session (see prisma/schema.prisma), so this is a parallel, minimal
    // magic-link flow rather than reusing the visitor providers above: a
    // Listener is seeded, not self-serve, so there's no "bind an email to
    // an existing anonymous Session" step to do — just prove the requester
    // controls a seeded Listener's inbox.
    Credentials({
      id: "listener-login",
      name: "Listener sign-in",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials): Promise<User | null> {
        const token = credentials?.token;
        if (typeof token !== "string" || !token) return null;

        const record = await prisma.listenerLoginToken.findUnique({
          where: { tokenHash: hashToken(token) },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) return null;

        await prisma.listenerLoginToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });

        const listener = await prisma.listener.findUnique({ where: { id: record.listenerId } });
        if (!listener) return null;

        return { id: listener.id, email: listener.email, isAdmin: listener.isAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const t = token as SessionToken;
      if (user && account?.provider === "listener-login") {
        t.listenerId = user.id;
        t.isAdmin = user.isAdmin ?? false;
      } else if (user) {
        t.sessionId = user.id;
        if (user.email) t.email = user.email;
        if (user.phone) t.phone = user.phone;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as SessionToken;
      if (t.sessionId) session.user.id = t.sessionId;
      if (t.email) session.user.email = t.email;
      if (t.phone) session.user.phone = t.phone;
      if (t.listenerId) {
        session.user.listenerId = t.listenerId;
        session.user.isAdmin = t.isAdmin ?? false;
      }
      return session;
    },
  },
});

/**
 * Shared logic behind both providers: if this email already belongs to a
 * *different* Session (a returning visitor signing in from a new browser),
 * resume that original identity rather than leaving it split across two
 * Session rows. Otherwise, bind the email to the Session that actually
 * requested this sign-in.
 */
async function bindOrResumeByEmail(email: string, requestingSessionId: string): Promise<User> {
  const existing = await prisma.session.findUnique({ where: { email } });
  if (existing && existing.id !== requestingSessionId) {
    return { id: existing.id, email };
  }

  const session = await prisma.session.update({
    where: { id: requestingSessionId },
    data: { email },
  });
  return { id: session.id, email: session.email };
}

/** Same idea as bindOrResumeByEmail, for the phone/OTP provider. */
async function bindOrResumeByPhone(phone: string, requestingSessionId: string): Promise<User> {
  const existing = await prisma.session.findUnique({ where: { phone } });
  if (existing && existing.id !== requestingSessionId) {
    return { id: existing.id, phone };
  }

  const session = await prisma.session.update({
    where: { id: requestingSessionId },
    data: { phone },
  });
  return { id: session.id, phone: session.phone };
}
