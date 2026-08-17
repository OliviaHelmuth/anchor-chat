import { cookies } from "next/headers";
import { auth } from "@/auth";

// Anonymous identity: an unguessable cookie naming a Session row, set the
// moment someone clicks "start chat" with zero fields filled in (FR-1.1).
// Once Milestone 2's sign-in binds an email/phone, Auth.js's own JWT
// session takes over as the stronger signal — see getSessionId() below —
// but this cookie is still what makes the *anonymous* path work at all,
// and it's still checked as a fallback (e.g. before any sign-in happens).
export const SESSION_COOKIE = "anchor_session";

export async function getSessionId(): Promise<string | undefined> {
  const authSession = await auth();
  if (authSession?.user?.id) return authSession.user.id;

  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — long enough to resume, not indefinite
  });
}
