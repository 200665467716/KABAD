-- 14 novembre : l'équipe KABAD refuse un hackathon proposé, avec une raison lue par l'organisateur.

-- AlterTable
ALTER TABLE "Hackathon" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" VARCHAR(500);

