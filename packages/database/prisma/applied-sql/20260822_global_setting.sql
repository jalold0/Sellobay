-- Global sozlamalar jadvali — 2026-08-22 da jonli Neon bazasiga qo'llangan.
-- `prisma migrate diff` bilan generatsiya qilingan (qo'lda yozilmagan).
-- Faqat qo'shuvchi: bitta yangi jadval. Mavjud jadvallar tegilmagan.
--
--   npx prisma db execute --file prisma/applied-sql/20260822_global_setting.sql --schema prisma/schema.prisma

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "config" JSONB NOT NULL,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

