-- CreateEnum
CREATE TYPE "CustodyMethod" AS ENUM ('MANUAL', 'SCAN', 'QR', 'CODE', 'PHOTO');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "handoverAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handoverMethod" "CustodyMethod",
ADD COLUMN     "handoverPin" TEXT,
ADD COLUMN     "parcelCode" TEXT;

-- AlterTable
ALTER TABLE "DeliveryEvent" ADD COLUMN     "actorId" UUID,
ADD COLUMN     "method" "CustodyMethod";

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_parcelCode_key" ON "Delivery"("parcelCode");

-- CreateIndex
CREATE INDEX "DeliveryEvent_actorId_idx" ON "DeliveryEvent"("actorId");

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

