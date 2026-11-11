-- Photo des groupes : l'image vit dans sa propre table, pour ne jamais être chargée avec la liste des
-- conversations ; "photoAt" date le dernier changement et sert de version à l'adresse de l'image.

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "photoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GroupPhoto" (
    "conversationId" TEXT NOT NULL,
    "mime" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "GroupPhoto_pkey" PRIMARY KEY ("conversationId")
);

-- AddForeignKey
ALTER TABLE "GroupPhoto" ADD CONSTRAINT "GroupPhoto_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

