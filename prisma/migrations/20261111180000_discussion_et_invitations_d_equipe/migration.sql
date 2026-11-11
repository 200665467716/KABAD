-- Hackathons : chaque équipe a sa discussion dans la messagerie (H4), et le chef d'équipe
-- peut inviter des coéquipiers (H3). Une invitation est une demande d'entrée faite dans l'autre sens.

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "conversationId" TEXT;

-- AlterTable
ALTER TABLE "TeamJoinRequest" ADD COLUMN     "invited" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Team_conversationId_key" ON "Team"("conversationId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
