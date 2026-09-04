-- Group Buy (guruh xaridi) real backend + Payment tranzaksiya id'si uchun UNIQUE.
--
-- ⚠️ DIQQAT — qo'llashdan OLDIN o'qing:
-- Pastdagi `Payment_provider_externalId_key` unique indeksi bazada AYNI
-- (provider, externalId) juftligi takrorlangan qatorlar bo'lsa XATO beradi.
-- Avval tekshiring:
--
--   SELECT provider, "externalId", COUNT(*)
--   FROM "Payment"
--   WHERE "externalId" IS NOT NULL
--   GROUP BY provider, "externalId"
--   HAVING COUNT(*) > 1;
--
-- Natija bo'sh bo'lsa — migratsiya xavfsiz. Dublikat chiqsa, avval ularni
-- qo'lda birlashtiring/o'chiring (qaysi biri haqiqiy to'lov ekanini
-- rawPayload va paidAt bo'yicha aniqlash mumkin), keyin migratsiyani ishga
-- tushiring. NULL externalId'li qatorlar (COD, qo'lda karta) cheklovga
-- tushmaydi — Postgres'da NULL'lar unique uchun teng emas.

-- CreateEnum
CREATE TYPE "GroupBuyStatus" AS ENUM ('OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED');
-- DropIndex
DROP INDEX "Payment_provider_externalId_idx";
-- CreateTable
CREATE TABLE "GroupBuy" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "soloPrice" DECIMAL(14,2) NOT NULL,
    "groupPrice" DECIMAL(14,2) NOT NULL,
    "targetSize" INTEGER NOT NULL,
    "status" "GroupBuyStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupBuy_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "GroupBuyMember" (
    "id" UUID NOT NULL,
    "groupBuyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orderId" UUID,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupBuyMember_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "GroupBuy_status_expiresAt_idx" ON "GroupBuy"("status", "expiresAt");
-- CreateIndex
CREATE INDEX "GroupBuy_productId_idx" ON "GroupBuy"("productId");
-- CreateIndex
CREATE INDEX "GroupBuyMember_userId_idx" ON "GroupBuyMember"("userId");
-- CreateIndex
CREATE UNIQUE INDEX "GroupBuyMember_groupBuyId_userId_key" ON "GroupBuyMember"("groupBuyId", "userId");
-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_externalId_key" ON "Payment"("provider", "externalId");
-- AddForeignKey
ALTER TABLE "GroupBuy" ADD CONSTRAINT "GroupBuy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "GroupBuyMember" ADD CONSTRAINT "GroupBuyMember_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "GroupBuy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "GroupBuyMember" ADD CONSTRAINT "GroupBuyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "GroupBuyMember" ADD CONSTRAINT "GroupBuyMember_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
