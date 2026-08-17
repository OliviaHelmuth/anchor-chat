import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { getWaitingQueueEntries } from "@/lib/queue";
import { ListenerQueueList } from "@/app/_components/ListenerQueueList";

export default async function ListenerQueuePage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");

  const entries = await getWaitingQueueEntries();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Queue</h1>
        <p className="text-sm text-muted">
          {listener.isAdmin ? "Signed in as admin." : "Signed in as Listener."}
        </p>
      </div>
      <ListenerQueueList initial={entries} />
    </main>
  );
}
