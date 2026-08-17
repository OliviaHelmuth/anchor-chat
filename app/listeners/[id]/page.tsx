import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getListener } from "@/lib/listener-auth";
import { ReviewForm } from "@/app/_components/ReviewForm";

// FR-9.1 — public, no auth required to view.
export default async function ListenerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const listener = await prisma.listener.findUnique({
    where: { id },
    include: {
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { displayName: true } } },
      },
    },
  });
  if (!listener) notFound();

  const viewer = await getListener();
  const canReview = viewer !== null && viewer.id !== listener.id;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">{listener.displayName ?? "This Listener hasn't set up their profile yet"}</h1>
        {listener.bio && <p className="mt-3 text-sm text-muted">{listener.bio}</p>}
        <p className="mt-4 text-xs text-muted">
          Volunteer, vetted by overshare.io&apos;s admin — not a therapist or
          counselor, and no clinical credential is implied. overshare.io is a
          practice/portfolio project.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg">
          Peer reviews ({listener.reviewsReceived.length})
        </h2>
        {listener.reviewsReceived.length === 0 && (
          <p className="text-sm text-muted">No reviews yet.</p>
        )}
        <ul className="flex flex-col gap-3">
          {listener.reviewsReceived.map((review) => (
            <li key={review.id} className="rounded-xl border border-border bg-surface px-5 py-4">
              <p className="text-sm">{review.body}</p>
              <p className="mt-2 text-xs text-muted">
                — {review.author.displayName ?? "A Listener"}
              </p>
            </li>
          ))}
        </ul>

        {canReview && <ReviewForm listenerId={listener.id} />}
      </section>
    </main>
  );
}
