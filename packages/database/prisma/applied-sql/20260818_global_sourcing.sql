-- Global sourcing (Xitoy) — 2026-08-18 da jonli Neon bazasiga qo'llangan.
--
-- Bu SQL QO'LDA YOZILMAGAN: `prisma migrate diff` bilan generatsiya qilingan
-- (jonli baza -> yangi schema.prisma). `migrate dev` ishlatilmadi, chunki loyihada
-- migration tarixi yo'q (baza `db push` bilan qurilgan) va u drift ko'rib
-- bazani reset qilishni taklif qilardi.
--
-- Mazmuni FAQAT qo'shuvchi: 5 enum, 3 yangi jadval, 11 index, 6 tashqi kalit.
-- Mavjud jadvallarning birorta ustuni o'zgartirilmagan/o'chirilmagan.
--
-- Boshqa muhitga (staging/yangi baza) qo'llash:
--   npx prisma db execute --file prisma/applied-sql/20260818_global_sourcing.sql --schema prisma/schema.prisma

-- CreateEnum
CREATE TYPE "SourcingPlatform" AS ENUM ('TAOBAO', 'TMALL', 'ALIBABA_1688', 'WEIDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "FreightMode" AS ENUM ('AUTO', 'AVIA');

-- CreateEnum
CREATE TYPE "SourcingStatus" AS ENUM ('NEW', 'IN_REVIEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'UNAVAILABLE', 'ORDERED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WeightCategory" AS ENUM ('TSHIRT', 'OUTERWEAR', 'SHOES', 'BAG', 'ACCESSORY', 'SMALL_ELECTRONICS', 'COSMETICS', 'TOY', 'HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "GlobalFulfillmentStatus" AS ENUM ('NEW', 'PRICE_CHECK', 'PRICE_CHANGED', 'CONFIRMED', 'PURCHASED', 'IN_CARGO', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "SourcingRequest" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "status" "SourcingStatus" NOT NULL DEFAULT 'NEW',
    "sourceUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "platform" "SourcingPlatform" NOT NULL DEFAULT 'OTHER',
    "externalItemId" TEXT,
    "needsResolve" BOOLEAN NOT NULL DEFAULT false,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "freightMode" "FreightMode" NOT NULL DEFAULT 'AUTO',
    "variantNote" TEXT,
    "customerNote" TEXT,
    "quotedPriceCny" DECIMAL(12,2),
    "quotedWeightKg" DECIMAL(8,3),
    "quotedTotal" DECIMAL(14,2),
    "quotedUnit" DECIMAL(14,2),
    "quotedBreakdown" JSONB,
    "leadTimeMinDays" INTEGER,
    "leadTimeMaxDays" INTEGER,
    "quoteExpiresAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "quotedById" UUID,
    "operatorNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "orderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSource" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "platform" "SourcingPlatform" NOT NULL DEFAULT 'TAOBAO',
    "sourceUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "externalItemId" TEXT,
    "priceCny" DECIMAL(12,2) NOT NULL,
    "chinaDomesticCny" DECIMAL(12,2),
    "lastSeenPriceCny" DECIMAL(12,2),
    "priceCheckedAt" TIMESTAMP(3),
    "weightCategory" "WeightCategory" NOT NULL DEFAULT 'OTHER',
    "manualWeightKg" DECIMAL(8,3),
    "estimatedWeightKg" DECIMAL(8,3) NOT NULL,
    "actualWeightKg" DECIMAL(8,3),
    "weightSamples" INTEGER NOT NULL DEFAULT 0,
    "lengthCm" DECIMAL(7,1),
    "widthCm" DECIMAL(7,1),
    "heightCm" DECIMAL(7,1),
    "defaultFreightMode" "FreightMode" NOT NULL DEFAULT 'AUTO',
    "marginPct" DECIMAL(6,4),
    "priceBreakdown" JSONB,
    "pricedAt" TIMESTAMP(3),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFulfillment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "GlobalFulfillmentStatus" NOT NULL DEFAULT 'NEW',
    "freightMode" "FreightMode" NOT NULL DEFAULT 'AUTO',
    "paidTotal" DECIMAL(14,2) NOT NULL,
    "verifiedPriceCny" DECIMAL(12,2),
    "verifiedTotal" DECIMAL(14,2),
    "varianceDecision" TEXT,
    "absorbedTotal" DECIMAL(14,2),
    "extraChargeTotal" DECIMAL(14,2),
    "verifiedAt" TIMESTAMP(3),
    "purchaseRef" TEXT,
    "actualWeightKg" DECIMAL(8,3),
    "trackNumber" TEXT,
    "cargoRegisteredAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "operatorId" UUID,
    "operatorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcingRequest_number_key" ON "SourcingRequest"("number");

-- CreateIndex
CREATE INDEX "SourcingRequest_userId_status_idx" ON "SourcingRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "SourcingRequest_status_createdAt_idx" ON "SourcingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SourcingRequest_platform_externalItemId_idx" ON "SourcingRequest"("platform", "externalItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSource_productId_key" ON "GlobalSource"("productId");

-- CreateIndex
CREATE INDEX "GlobalSource_platform_externalItemId_idx" ON "GlobalSource"("platform", "externalItemId");

-- CreateIndex
CREATE INDEX "GlobalSource_isAvailable_idx" ON "GlobalSource"("isAvailable");

-- CreateIndex
CREATE INDEX "GlobalSource_priceCheckedAt_idx" ON "GlobalSource"("priceCheckedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFulfillment_orderId_key" ON "GlobalFulfillment"("orderId");

-- CreateIndex
CREATE INDEX "GlobalFulfillment_status_createdAt_idx" ON "GlobalFulfillment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GlobalFulfillment_trackNumber_idx" ON "GlobalFulfillment"("trackNumber");

-- AddForeignKey
ALTER TABLE "SourcingRequest" ADD CONSTRAINT "SourcingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRequest" ADD CONSTRAINT "SourcingRequest_quotedById_fkey" FOREIGN KEY ("quotedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRequest" ADD CONSTRAINT "SourcingRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalSource" ADD CONSTRAINT "GlobalSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFulfillment" ADD CONSTRAINT "GlobalFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalFulfillment" ADD CONSTRAINT "GlobalFulfillment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

