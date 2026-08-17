import { prisma } from "./prisma";
import type { ListenerApplication } from "@prisma/client";

/**
 * Pending first (oldest first — fair review order), then everything already
 * decided, most-recently-decided first. Grouped in JS rather than an enum
 * ORDER BY: Postgres would sort APPROVED/PENDING/REJECTED alphabetically,
 * which puts PENDING in the middle — not what an admin queue needs.
 */
export async function listApplicationsForReview(): Promise<{
  pending: ListenerApplication[];
  reviewed: ListenerApplication[];
}> {
  const all = await prisma.listenerApplication.findMany({ orderBy: { createdAt: "asc" } });
  return {
    pending: all.filter((application) => application.status === "PENDING"),
    reviewed: all.filter((application) => application.status !== "PENDING").reverse(),
  };
}
