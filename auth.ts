import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

// Auth.js's default User/Session shape has no room for a phone number, and
// our "user" isn't really a User at all — it's the same anonymous Session
// row from Milestone 1, now with an email or phone bound to it. Extending
// the types here keeps that mapping explicit instead of casting to `any`
// at every call site.
declare module "next-auth" {
  interface User {
    phone?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      phone?: string | null;
    };
  }
}

// Augmenting next-auth/jwt's ambient JWT type directly didn't resolve
// cleanly under this project's moduleResolution setting, so the jwt/session
// callbacks below cast to this instead — same effect, one place to look.
type SessionToken = {
  sessionId?: string;
  email?: string | null;
  phone?: string | null;
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
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as SessionToken;
      if (user) {
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
