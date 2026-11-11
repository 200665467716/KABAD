-- Décision D12 : KABAD ne garde ni ne verse d'argent. Les cagnottes, les contributions et les versements
-- disparaissent ; un hackathon annonce de 0 à 5 prix en texte libre ("prizes"), donnés selon le classement.

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_hackathonId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_beneficiaryId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_hackathonId_fkey";

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
DROP TYPE "ContributionStatus";

-- DropEnum
DROP TYPE "PayoutRole";

-- DropEnum
DROP TYPE "PayoutStatus";

-- DropEnum
DROP TYPE "PrizeKind";


-- Notifications des cagnottes : elles n'ont plus d'écran ni de texte.
DELETE FROM "Notification" WHERE "key" IN ('teamWonMoney', 'payoutSent', 'payoutDue');

-- Les anciennes victoires n'ont pas le nom du prix : elles deviennent « ton équipe remporte le hackathon ».
UPDATE "Notification" SET "key" = 'teamWon' WHERE "key" = 'teamWonPrize';
