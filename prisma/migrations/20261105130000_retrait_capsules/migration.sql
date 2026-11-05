-- Les capsules sont retirées du produit (mise à jour du 5 novembre 2026) : leur table et leur thème disparaissent.

-- DropForeignKey
ALTER TABLE "Capsule" DROP CONSTRAINT "Capsule_authorId_fkey";

-- DropTable
DROP TABLE "Capsule";

-- DropEnum
DROP TYPE "CapsuleTheme";

