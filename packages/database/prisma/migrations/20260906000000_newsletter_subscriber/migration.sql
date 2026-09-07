-- Footer'dagi obuna ro'yxati.
--
-- Ilgari forma HECH QAYERGA yozmasdi: 600ms kutib, "Rahmat! Email tasdiqlandi"
-- xabarini chiqarardi va emailni tashlab yuborardi. Ya'ni mijoz obuna bo'ldim
-- deb o'ylardi, ro'yxat esa yig'ilmasdi va va'da qilingan xatlar kelmasdi.
--
-- Faqat YANGI jadval qo'shiladi — mavjud ma'lumotga tegilmaydi, buzg'unchi
-- amal yo'q. Migratsiya qo'llanmaguncha forma xato xabarini beradi (jim
-- muvaffaqiyat KO'RSATMAYDI).

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "locale" VARCHAR(5),
    "source" VARCHAR(40),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_unsubscribedAt_idx" ON "NewsletterSubscriber"("unsubscribedAt");
