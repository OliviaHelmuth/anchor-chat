import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { prisma } from "@/lib/prisma";
import { AdminListenersPanel } from "@/app/_components/AdminListenersPanel";

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Listeners</h1>
        <p className="text-sm text-muted">Admin-only listing management (FR-9.3).</p>
      </div>
      <AdminListenersPanel initial={rows} />
    </main>
  );
}
