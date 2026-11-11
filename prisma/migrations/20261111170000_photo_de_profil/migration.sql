-- Photo de profil : comme pour les groupes, l'image vit dans sa propre table et "photoAt" date
-- le dernier changement ; il sert de version à l'adresse de l'image.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserPhoto" (
    "userId" TEXT NOT NULL,
    "mime" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
