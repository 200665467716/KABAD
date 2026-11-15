-- 13 novembre : description des groupes, réponse à un message, messages épinglés, et groupe des
-- instructeurs d'un hackathon (ouvert à la première mission acceptée, l'organisateur en est responsable).

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "description" VARCHAR(300);

-- AlterTable
ALTER TABLE "Hackathon" ADD COLUMN     "instructorsConversationId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "replyToId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Hackathon_instructorsConversationId_key" ON "Hackathon"("instructorsConversationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_pinnedAt_idx" ON "Message"("conversationId", "pinnedAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hackathon" ADD CONSTRAINT "Hackathon_instructorsConversationId_fkey" FOREIGN KEY ("instructorsConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

