import { getSessionId } from "@/lib/session";
import { getQueuePosition, getWaitEstimateSeconds } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { StartChat } from "./_components/StartChat";
import { WaitingRoom } from "./_components/WaitingRoom";

export default async function Home() {
  const sessionId = await getSessionId();
  const position = sessionId ? await getQueuePosition(sessionId) : null;

  const identified = sessionId
    ? await prisma.session
        .findUnique({ where: { id: sessionId }, select: { email: true, phone: true } })
        .then((s) => Boolean(s?.email || s?.phone))
    : false;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">Anchor Chat</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          A practice project — not a real support service. See the README for
          what this is and isn&apos;t.
        </p>
      </div>

      {position !== null ? (
        <WaitingRoom
          initial={{ position, waitSeconds: await getWaitEstimateSeconds(position) }}
          identified={identified}
        />
      ) : (
        <StartChat />
      )}
    </main>
  );
}
