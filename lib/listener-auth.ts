import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type Listener = { id: string; isAdmin: boolean };

export async function getListener(): Promise<Listener | null> {
  const session = await auth();
  if (!session?.user?.listenerId) return null;
  return { id: session.user.listenerId, isAdmin: session.user.isAdmin ?? false };
}

// "Role check middleware" per tasks/TASKS.md T3.2 — not literal Next.js
// middleware.ts (edge runtime, no Prisma access), but the same in-route
// convention lib/session.ts's getSessionId() already established: every
// Listener-only route handler calls this first, never trusts a client-sent
// role (docs/technical-requirements.md).
export async function requireListener(): Promise<Listener | NextResponse> {
  const listener = await getListener();
  if (!listener) {
    return NextResponse.json({ error: "Listener sign-in required" }, { status: 403 });
  }
  return listener;
}

// FR-4.4 — admin-only actions (Milestone 3.5's application review/approval,
// removing a Listener listing) layer this on top of requireListener().
export async function requireAdmin(): Promise<Listener | NextResponse> {
  const result = await requireListener();
  if (result instanceof NextResponse) return result;
  if (!result.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return result;
}
