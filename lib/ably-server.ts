import Ably from "ably";

// Server-side only — holds the full API key. Never import this from a
// client component; use /api/ably/token for browser subscriptions instead
// (docs/challenges/ai-triage.md's "minimal exposure" logic applies here too:
// the browser gets a scoped, short-lived token, never the root key).
const globalForAbly = globalThis as unknown as {
  ablyRest: Ably.Rest | undefined;
};

export const ablyRest =
  globalForAbly.ablyRest ??
  new Ably.Rest({ key: process.env.ABLY_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForAbly.ablyRest = ablyRest;
}

// Queue-channel updates carry no personal data — just a ping. Every
// subscriber (visitor or, from Milestone 3, counselor) re-fetches its own
// scoped view over REST rather than trusting anything in the payload. This
// is what keeps one visitor's realtime channel from ever being able to leak
// another visitor's queue position or session id.
export async function publishQueueUpdate() {
  await ablyRest.channels.get("queue").publish("update", {});
}

// Unlike the queue channel, chat:{id} payloads carry real message content —
// that's expected (it's the whole point of the channel), but it's exactly
// why /api/ably/token scopes subscribe access to the two participants of
// that specific chat, never a wildcard. Publishing stays server-side only
// (no client publish capability is ever granted) so this is the one place a
// message reaches Ably at all.
export type ChatMessagePayload = {
  id: string;
  sender: "VISITOR" | "LISTENER";
  body: string;
  sequence: number;
  createdAt: string;
};

export async function publishChatMessage(sessionId: string, message: ChatMessagePayload) {
  await ablyRest.channels.get(`chat:${sessionId}`).publish("message", message);
}
