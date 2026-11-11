-- Notifications par e-mail : le worker note chaque notification traitée, et chaque membre peut couper ces e-mails.

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Notification_emailedAt_createdAt_idx" ON "Notification"("emailedAt", "createdAt");

-- Les notifications déjà là ne partent pas par e-mail.
UPDATE "Notification" SET "emailedAt" = "createdAt";
