-- CreateEnum
CREATE TYPE "DeliveryKind" AS ENUM ('OUTBOUND', 'RETURN');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "kind" "DeliveryKind" NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "returnWarehouseId" UUID;

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "DeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryItem_deliveryId_idx" ON "DeliveryItem"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryItem_deliveryId_orderItemId_key" ON "DeliveryItem"("deliveryId", "orderItemId");

-- CreateIndex
CREATE INDEX "Delivery_kind_status_idx" ON "Delivery"("kind", "status");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_returnWarehouseId_fkey" FOREIGN KEY ("returnWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

