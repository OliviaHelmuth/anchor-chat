import { prisma } from "./prisma";
import { getSessionId } from "./session";
import { getListener } from "./listener-auth";

type VisitorAccess = { sessionId: string };
type ListenerAccess = { sessionId: string; listenerId: string };

async function loadChatSession(chatSessionId: string) {
  return prisma.session.findUnique({
    where: { id: chatSessionId },
    select: { id: true, listenerId: true },
  });
}

/**
 * Visitor-only identity check for chat:{chatSessionId} — deliberately never
 * consults getListener(). This and resolveListenerChatAccess back two
 * separate message routes (visitor vs Listener) specifically so role comes
 * from which route the request hit, not from guessing between two cookies
 * that can legitimately coexist in one browser — e.g. the seeded admin
 * ("Menty B") starting a visitor chat to test the product while also
 * signed in as the Listener who claims it, the exact dual-role pattern
 * already on record in tasks/TASKS.md's Milestone 3.5 verification notes.
 * A single combined check would silently misattribute one role's messages
 * to the other whenever both identities point at the same chat.
 */
export async function resolveVisitorChatAccess(
  chatSessionId: string,
): Promise<VisitorAccess | null> {
  const session = await loadChatSession(chatSessionId);
  if (!session) return null;
  const visitorSessionId = await getSessionId();
  if (visitorSessionId !== session.id) return null;
  return { sessionId: session.id };
}

/** Listener-only identity check — mirror of resolveVisitorChatAccess, same reasoning. */
export async function resolveListenerChatAccess(
  chatSessionId: string,
): Promise<ListenerAccess | null> {
  const session = await loadChatSession(chatSessionId);
  if (!session) return null;
  const listener = await getListener();
  if (!listener || session.listenerId !== listener.id) return null;
  return { sessionId: session.id, listenerId: listener.id };
}
