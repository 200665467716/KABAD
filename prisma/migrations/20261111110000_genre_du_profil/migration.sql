-- Genre facultatif sur le profil : il sert seulement à accorder les textes (« Vérifiée », « il peut t'aider »).

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";

