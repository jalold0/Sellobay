// Migratsiyadan OLDIN o'tkaziladigan tekshiruv: `Payment` jadvalida
// takrorlangan `(provider, externalId)` juftligi bormi?
//
// NEGA KERAK: `20260904000000_group_buy_and_payment_unique` migratsiyasi
// `Payment(provider, externalId)` ustiga UNIQUE indeks qo'yadi. Bazada
// dublikat bo'lsa migratsiya XATO beradi va `_prisma_migrations` jadvalida
// "failed" yozuv qoldiradi — undan keyin qo'lda tozalash kerak bo'ladi.
//
// Bu skript FAQAT O'QIYDI, hech nima o'zgartirmaydi.
//
// Nega alohida skript: `prisma db execute` SELECT natijasini CHIQARMAYDI
// (u faqat SQL bajaradi), shuning uchun tekshiruvni u bilan qilib bo'lmaydi.
//
// Ishga tushirish:
//   pnpm db:check:payments
// yoki
//   node packages/database/scripts/tekshir-tolov-dublikat.mjs

import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL topilmadi. `.env` faylini tekshiring.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  // COUNT(*) bigint qaytaradi — JSON'ga aylanmasligi uchun int'ga o'giramiz.
  const rows = await prisma.$queryRaw`
    SELECT provider, "externalId", COUNT(*)::int AS soni
    FROM "Payment"
    WHERE "externalId" IS NOT NULL
    GROUP BY provider, "externalId"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;

  if (rows.length === 0) {
    console.log('');
    console.log('  DUBLIKAT YO`Q — migratsiya xavfsiz.');
    console.log('');
    console.log('  Keyingi qadam:  pnpm db:migrate:deploy');
    console.log('');
  } else {
    console.log('');
    console.log('  ' + rows.length + ' ta takrorlangan (provider, externalId) topildi:');
    console.log('');
    for (const r of rows) {
      console.log('    ' + r.provider + '  ' + r.externalId + '  -> ' + r.soni + ' marta');
    }
    console.log('');
    console.log('  Migratsiya bu holatda XATO beradi. Avval dublikatlarni hal qilish kerak:');
    console.log('  qaysi yozuv to`g`ri ekanini to`lov provayderi (Click/Payme) yozuvlari');
    console.log('  bilan solishtirib aniqlang, keyin ortiqchasini o`chiring.');
    console.log('');
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
