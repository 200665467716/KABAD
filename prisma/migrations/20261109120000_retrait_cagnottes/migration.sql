-- Les cagnottes sont retirées (9 novembre 2026) : l'organisateur fixe lui-même ses prix (liste "prizes")
-- et les remet aux gagnants. KABAD ne collecte ni ne verse plus d'argent pour les hackathons.

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_hackathonId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_hackathonId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_beneficiaryId_fkey";

-- AlterTable
ALTER TABLE "Hackathon" DROP COLUMN "prizeKind",
DROP COLUMN "sponsorAmount",
DROP COLUMN "sponsorName";

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "payoutOperator",
DROP COLUMN "payoutPhone";

-- DropTable
DROP TABLE "Contribution";

-- DropTable
DROP TABLE "Payout";

-- DropEnum
DROP TYPE "PrizeKind";

-- DropEnum
DROP TYPE "ContributionStatus";

-- DropEnum
DROP TYPE "PayoutRole";

-- DropEnum
DROP TYPE "PayoutStatus";
