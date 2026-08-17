import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { listApplicationsForReview } from "@/lib/applications";
import { ApplicationsReview } from "@/app/_components/ApplicationsReview";
import { AdminNav } from "@/app/_components/AdminNav";
import { AdminPageHeading } from "@/app/_components/AdminPageHeading";

export default async function AdminApplicationsPage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");
  if (!listener.isAdmin) redirect("/listener/queue");

  const { pending, reviewed } = await listApplicationsForReview();

  return (
    <>
      <AdminNav isAdmin={listener.isAdmin} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-16">
        <AdminPageHeading page="applications" />
        <ApplicationsReview initialPending={pending} initialReviewed={reviewed} />
      </main>
    </>
  );
}
