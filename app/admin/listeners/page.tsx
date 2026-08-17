import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { prisma } from "@/lib/prisma";
import { AdminListenersPanel } from "@/app/_components/AdminListenersPanel";
import { AdminNav } from "@/app/_components/AdminNav";
import { AdminPageHeading } from "@/app/_components/AdminPageHeading";

export default async function AdminListenersPage() {
  const viewer = await getListener();
  if (!viewer) redirect("/listener/login");
  if (!viewer.isAdmin) redirect("/listener/queue");

  const listeners = await prisma.listener.findMany({
    orderBy: { email: "asc" },
    include: {
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { displayName: true } } },
      },
    },
  });

  const rows = listeners.map((listener) => ({
    id: listener.id,
    email: listener.email,
    displayName: listener.displayName,
    isAdmin: listener.isAdmin,
    reviews: listener.reviewsReceived.map((review) => ({
      id: review.id,
      body: review.body,
      authorDisplayName: review.author.displayName,
    })),
  }));

  return (
    <>
      <AdminNav isAdmin={viewer.isAdmin} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
        <AdminPageHeading page="listeners" />
        <AdminListenersPanel initial={rows} />
      </main>
    </>
  );
}
