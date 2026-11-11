-- Salons Rise-Up : un événement peut être fermé avant sa fin ("endedAt"), et ne rappelle ses membres
-- que si son auteur a choisi de les prévenir ("remind").

-- AlterTable
ALTER TABLE "RiseEvent" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "remind" BOOLEAN NOT NULL DEFAULT true;

