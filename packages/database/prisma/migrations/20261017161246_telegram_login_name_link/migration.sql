-- AlterTable
ALTER TABLE "TelegramLogin" ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "linkAttempts" INTEGER NOT NULL DEFAULT 0;
