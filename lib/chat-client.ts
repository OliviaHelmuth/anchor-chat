// Shared by ChatWidget (visitor) and ListenerChat (Listener) — both render
// the same chat:{id} transcript, just mirrored. No server imports here so
// it's safe from either "use client" component.

export type ChatMessage = {
  id: string;
  sender: "VISITOR" | "LISTENER";
  body: string;
  sequence: number;
  createdAt: string;
};

// Dedupe by id (a just-sent message arrives twice: once from the POST
// response, once echoed back over Ably) and keep server-assigned `sequence`
// as the only ordering signal (FR-5.2) — never the order events arrived in.
export function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.sequence - b.sequence);
}
