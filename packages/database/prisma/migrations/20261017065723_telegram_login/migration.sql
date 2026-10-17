-- CreateTable
CREATE TABLE "TelegramLogin" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "telegramId" TEXT,
    "phone" TEXT,
    "firstName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLogin_tokenHash_key" ON "TelegramLogin"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramLogin_telegramId_idx" ON "TelegramLogin"("telegramId");
