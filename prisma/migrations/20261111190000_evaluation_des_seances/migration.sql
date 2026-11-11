-- Mentorat : après la séance, le dev la note de 1 à 5, une seule fois, avec un mot facultatif.

-- AlterTable
ALTER TABLE "MentoringBooking" ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "ratingComment" VARCHAR(300),
ADD COLUMN     "ratedAt" TIMESTAMP(3);
