import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { getWaitingQueueEntries, getOngoingSessionsForListener } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/app/_components/AdminNav";
import { AdminDashboard } from "@/app/_components/AdminDashboard";
import { QueuePageHeading } from "@/app/_components/QueuePageHeading";

export default async function ListenerQueuePage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");

  const [queue, ongoing, listenerRecord] = await Promise.all([
    getWaitingQueueEntries(),
    getOngoingSessionsForListener(listener.id),
    prisma.listener.findUnique({ where: { id: listener.id }, select: { displayName: true } }),
  ]);

  return (
    <>
      <AdminNav isAdmin={listener.isAdmin} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <QueuePageHeading isAdmin={listener.isAdmin} />
        <AdminDashboard
          initialQueue={queue}
          initialOngoing={ongoing}
          listenerDisplayName={listenerRecord?.displayName ?? null}
        />
      </main>
    </>
  );
}
