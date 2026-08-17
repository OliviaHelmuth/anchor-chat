import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { listApplicationsForReview } from "@/lib/applications";
import { ApplicationsReview } from "@/app/_components/ApplicationsReview";

export default async function AdminApplicationsPage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");
  if (!listener.isAdmin) redirect("/listener/queue");

  const { pending, reviewed } = await listApplicationsForReview();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Listener applications</h1>
        <p className="text-sm text-muted">Admin-only review queue.</p>
      </div>
      <ApplicationsReview initialPending={pending} initialReviewed={reviewed} />
    </main>
  );
}
