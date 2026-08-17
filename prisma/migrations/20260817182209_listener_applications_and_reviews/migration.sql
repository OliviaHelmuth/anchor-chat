-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "ListenerLoginToken" DROP CONSTRAINT "ListenerLoginToken_listenerId_fkey";

-- AlterTable
ALTER TABLE "Listener" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT;

-- CreateTable
CREATE TABLE "ListenerApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ListenerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListenerReview" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "authorListenerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListenerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListenerApplication_status_createdAt_idx" ON "ListenerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ListenerReview_listenerId_idx" ON "ListenerReview"("listenerId");

-- AddForeignKey
ALTER TABLE "ListenerReview" ADD CONSTRAINT "ListenerReview_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Listener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListenerReview" ADD CONSTRAINT "ListenerReview_authorListenerId_fkey" FOREIGN KEY ("authorListenerId") REFERENCES "Listener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListenerLoginToken" ADD CONSTRAINT "ListenerLoginToken_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Listener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

