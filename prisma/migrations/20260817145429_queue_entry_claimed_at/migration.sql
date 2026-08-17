-- AlterTable
ALTER TABLE "QueueEntry" ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QueueEntry_status_claimedAt_idx" ON "QueueEntry"("status", "claimedAt");
