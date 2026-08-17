import { prisma } from "./prisma";
import { publishChatMessage } from "./ably-server";
import type { ChatMessage } from "./chat-client";

// Shared by both role-specific message routes (visitor and Listener) — the
// auth check differs per route (lib/chat.ts), but the actual read/write
// shape doesn't.

export async function listMessages(sessionId: string, since?: number): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      sessionId,
      ...(since !== undefined && Number.isFinite(since) ? { sequence: { gt: since } } : {}),
    },
    orderBy: { sequence: "asc" },
    select: { id: true, sender: true, body: true, sequence: true, createdAt: true },
  });
  return messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}

// FR-5.1/5.2 — write first (server-assigned `sequence`, never client-trusted
// order), then publish; a classification step (Milestone 5) will slot in
// between those two without changing this shape (FR-6.3: never gate
// delivery on it).
export async function sendMessage(
  sessionId: string,
  sender: "VISITOR" | "LISTENER",
  body: string,
): Promise<ChatMessage> {
  const message = await prisma.message.create({
    data: { sessionId, sender, body },
    select: { id: true, sender: true, body: true, sequence: true, createdAt: true },
  });

  const payload: ChatMessage = { ...message, createdAt: message.createdAt.toISOString() };
  await publishChatMessage(sessionId, payload);
  return payload;
}
