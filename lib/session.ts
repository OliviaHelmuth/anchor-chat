import { cookies } from "next/headers";

// Interim, pre-Auth.js identity: an unguessable cookie naming a Session
// row. Milestone 2 upgrades this to a real Auth.js session bound to an
// email/phone; until then, this cookie *is* the visitor's whole identity —
// which is the point (FR-1.1: usable with zero fields filled in).
export const SESSION_COOKIE = "anchor_session";

export async function getSessionId(): Promise<string | undefined> {
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
