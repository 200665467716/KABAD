-- 14 novembre : co-responsables d'un projet Rise-Up, salons proposés par un contributeur à valider,
-- message du projet masqué par un responsable (avec justificatif) ou par l'équipe, message d'un groupe
-- retiré par son responsable.

-- CreateEnum
CREATE TYPE "RiseRole" AS ENUM ('MEMBER', 'CO_LEAD');

-- AlterEnum
ALTER TYPE "ReportTarget" ADD VALUE 'RISE_POST';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hiddenById" TEXT;

-- AlterTable
ALTER TABLE "RiseEvent" ADD COLUMN     "approvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RiseMember" ADD COLUMN     "role" "RiseRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "RisePost" ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" VARCHAR(300);


-- Les événements et salons déjà créés restent visibles : ils comptent comme validés.
UPDATE "RiseEvent" SET "approvedAt" = "createdAt" WHERE "approvedAt" IS NULL;
