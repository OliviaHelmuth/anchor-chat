import { redirect } from "next/navigation";
import { getListener } from "@/lib/listener-auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/app/_components/ProfileEditForm";
import { AdminNav } from "@/app/_components/AdminNav";
import { ProfilePageHeading } from "@/app/_components/ProfilePageHeading";

export default async function ListenerProfileEditPage() {
  const listener = await getListener();
  if (!listener) redirect("/listener/login");

  const record = await prisma.listener.findUnique({ where: { id: listener.id } });
  if (!record) redirect("/listener/login");

  return (
    <>
      <AdminNav isAdmin={listener.isAdmin} />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
        <ProfilePageHeading listenerId={record.id} />
        <ProfileEditForm initialDisplayName={record.displayName ?? ""} initialBio={record.bio ?? ""} />
      </main>
    </>
  );
}
