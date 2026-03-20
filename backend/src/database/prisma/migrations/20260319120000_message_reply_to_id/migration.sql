-- AlterTable
ALTER TABLE "messages" ADD COLUMN "replyToId" TEXT;

-- CreateIndex
CREATE INDEX "messages_replyToId_idx" ON "messages"("replyToId");
