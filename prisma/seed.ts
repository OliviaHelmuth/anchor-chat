// T3.1 — seeds the one admin Listener account ("Menty B"). No self-serve
// Listener signup exists (see tasks/TASKS.md Milestone 3) — this is the only
// way a Listener row gets created until Milestone 3.5's approval flow ships.
// Milestone 9 (T9.1) extends this same file with visitor/message seed data;
// don't start a second seed script there.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rawEmail = process.env.LISTENER_ADMIN_EMAIL;
  if (!rawEmail) {
    throw new Error(
      "LISTENER_ADMIN_EMAIL is not set — add it to .env before seeding (see .env.example)."
    );
  }
  // Must match the normalization in app/api/auth/request-listener-login —
  // that route lowercases the submitted email before looking it up.
  const email = rawEmail.trim().toLowerCase();

  const listener = await prisma.listener.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, isAdmin: true },
  });

  console.log(`Seeded admin Listener "Menty B": ${listener.email} (id: ${listener.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
