import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { getArchivedSessions } from "@/lib/queue";
import { AdminNav } from "@/app/_components/AdminNav";
import { AdminPageHeading } from "@/app/_components/AdminPageHeading";
import { ArchiveList } from "@/app/_components/ArchiveList";

// FR-11.6 — read-only, admin-only (same gating convention as
// /admin/applications and /admin/listeners), and deliberately spans every
// Listener's archived chats rather than just the viewer's own, since an
// admin auditing what's aged out shouldn't be scoped to their own claims.
export default async function AdminArchivePage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");
  if (!listener.isAdmin) redirect("/listener/queue");

  const archived = await getArchivedSessions();

  return (
    <>
      <AdminNav isAdmin={listener.isAdmin} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
        <AdminPageHeading page="archive" />
        <ArchiveList sessions={archived} />
      </main>
    </>
  );
}
