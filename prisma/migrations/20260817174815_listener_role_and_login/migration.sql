-- AlterEnum
BEGIN;
CREATE TYPE "MessageSender_new" AS ENUM ('VISITOR', 'LISTENER');
ALTER TABLE "Message" ALTER COLUMN "sender" TYPE "MessageSender_new" USING ("sender"::text::"MessageSender_new");
ALTER TYPE "MessageSender" RENAME TO "MessageSender_old";
ALTER TYPE "MessageSender_new" RENAME TO "MessageSender";
DROP TYPE "public"."MessageSender_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_counselorId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "counselorId",
ADD COLUMN     "listenerId" TEXT;

-- DropTable
DROP TABLE "Counselor";

-- CreateTable
CREATE TABLE "Listener" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Listener_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListenerLoginToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListenerLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listener_email_key" ON "Listener"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ListenerLoginToken_tokenHash_key" ON "ListenerLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ListenerLoginToken_listenerId_idx" ON "ListenerLoginToken"("listenerId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Listener"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListenerLoginToken" ADD CONSTRAINT "ListenerLoginToken_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "Listener"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

