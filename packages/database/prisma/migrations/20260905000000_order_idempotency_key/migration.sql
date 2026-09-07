-- Buyurtma takroriy yuborilishidan himoya (Idempotency-Key).
--
-- Mobil ilova allaqachon `Idempotency-Key` sarlavhasini yuborardi, lekin server
-- uni umuman o'qimasdi: tarmoq uzilib qayta urinilganda IKKINCHI buyurtma
-- yaratilardi (zaxira ikki marta kamayardi, Sello Coins ikki marta sarflanardi).
--
-- Ustun NULL bo'lishi mumkin (eski buyurtmalar va kalitsiz so'rovlar).
-- Postgres'da NULL'lar unique index uchun teng emas, shuning uchun kalitsiz
-- buyurtmalar cheklovga tushmaydi.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
