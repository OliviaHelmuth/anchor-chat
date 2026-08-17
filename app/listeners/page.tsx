import Link from "next/link";
import { prisma } from "@/lib/prisma";

// FR-9.1 — public directory, no auth required. Only Listeners who've set a
// display name are listed; a freshly-approved row with nothing filled in
// yet has nothing worth showing.
export default async function ListenersIndexPage() {
  const listeners = await prisma.listener.findMany({
    where: { displayName: { not: null } },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, bio: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Listeners</h1>
        <p className="mt-2 text-sm text-muted">
          Volunteers who&apos;ve been vetted and approved. Not therapists or
          counselors — see the disclaimer on each profile.
        </p>
      </div>

      {listeners.length === 0 ? (
        <p className="text-sm text-muted">No public profiles yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {listeners.map((listener) => (
            <li key={listener.id}>
              <Link
                href={`/listeners/${listener.id}`}
                className="block rounded-xl border border-border bg-surface px-5 py-4 transition hover:border-accent"
              >
                <span className="font-display text-lg">{listener.displayName}</span>
                {listener.bio && <p className="mt-1 text-sm text-muted line-clamp-2">{listener.bio}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
