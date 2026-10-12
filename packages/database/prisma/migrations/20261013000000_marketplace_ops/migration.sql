-- CreateEnum
CREATE TYPE "FulfillmentModel" AS ENUM ('FBS', 'FBO');

-- CreateEnum
CREATE TYPE "SellerShipmentStatus" AS ENUM ('NEW', 'ACCEPTED', 'PACKED', 'HANDED_OVER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('SALE', 'COMMISSION', 'FULFILLMENT_FEE', 'RETURN_SALE', 'RETURN_COMMISSION', 'RETURN_FULFILLMENT_FEE', 'PAYOUT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "carrierPayload" JSONB,
ADD COLUMN     "carrierStatus" TEXT,
ADD COLUMN     "carrierUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "GlobalSource" ADD COLUMN     "sourcingRequestId" UUID;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sellerShipmentId" UUID;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fulfillmentModel" "FulfillmentModel" NOT NULL DEFAULT 'FBS';

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "defaultFulfillmentModel" "FulfillmentModel" NOT NULL DEFAULT 'FBS';

-- AlterTable
ALTER TABLE "SellerPayout" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paidById" UUID;

-- CreateTable
CREATE TABLE "SellerShipment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sellerId" UUID,
    "fulfillmentModel" "FulfillmentModel" NOT NULL,
    "status" "SellerShipmentStatus" NOT NULL DEFAULT 'NEW',
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "packedAt" TIMESTAMP(3),
    "handedOverAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "receivedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerLedgerEntry" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "orderId" UUID,
    "orderItemId" UUID,
    "payoutId" UUID,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellerShipment_sellerId_status_idx" ON "SellerShipment"("sellerId", "status");

-- CreateIndex
CREATE INDEX "SellerShipment_status_deadlineAt_idx" ON "SellerShipment"("status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerShipment_orderId_sellerId_fulfillmentModel_key" ON "SellerShipment"("orderId", "sellerId", "fulfillmentModel");

-- CreateIndex
CREATE UNIQUE INDEX "SellerLedgerEntry_reference_key" ON "SellerLedgerEntry"("reference");

-- CreateIndex
CREATE INDEX "SellerLedgerEntry_sellerId_availableAt_idx" ON "SellerLedgerEntry"("sellerId", "availableAt");

-- CreateIndex
CREATE INDEX "SellerLedgerEntry_payoutId_idx" ON "SellerLedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "SellerLedgerEntry_orderId_idx" ON "SellerLedgerEntry"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_trackingNumber_idx" ON "Delivery"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_carrier_externalId_key" ON "Delivery"("carrier", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSource_sourcingRequestId_key" ON "GlobalSource"("sourcingRequestId");

-- CreateIndex
CREATE INDEX "SellerPayout_status_periodEnd_idx" ON "SellerPayout"("status", "periodEnd");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerShipmentId_fkey" FOREIGN KEY ("sellerShipmentId") REFERENCES "SellerShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShipment" ADD CONSTRAINT "SellerShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerShipment" ADD CONSTRAINT "SellerShipment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLedgerEntry" ADD CONSTRAINT "SellerLedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLedgerEntry" ADD CONSTRAINT "SellerLedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLedgerEntry" ADD CONSTRAINT "SellerLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalSource" ADD CONSTRAINT "GlobalSource_sourcingRequestId_fkey" FOREIGN KEY ("sourcingRequestId") REFERENCES "SourcingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

