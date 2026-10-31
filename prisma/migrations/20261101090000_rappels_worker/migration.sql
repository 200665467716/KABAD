-- AlterTable
ALTER TABLE "MentoringBooking" ADD COLUMN     "nudgedAt" TIMESTAMP(3),
ADD COLUMN     "remindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

