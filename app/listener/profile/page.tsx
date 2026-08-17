import Link from "next/link";
import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/app/_components/ProfileEditForm";

export default async function ListenerProfileEditPage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");

  const record = await prisma.listener.findUnique({ where: { id: listener.id } });
  if (!record) redirect("/listener/login");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl">Your public profile</h1>
        <p className="mt-2 text-sm text-muted">
          Shown on{" "}
          <Link href={`/listeners/${record.id}`} className="underline">
            your public page
          </Link>
          . No real legal name required — pick whatever you&apos;re
          comfortable showing.
        </p>
      </div>
      <ProfileEditForm initialDisplayName={record.displayName ?? ""} initialBio={record.bio ?? ""} />
    </main>
  );
}
