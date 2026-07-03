// COD (offline) buyurtma uchun strukturaviy Payment yozuvi yaratilishini tekshiradi.
// API orqali COD va PAYME (online) buyurtma yaratadi, DB'dan Payment holatini o'qiydi.
//   COD   → Payment{CASH_ON_DELIVERY, PENDING} bo'lishi kerak.
//   PAYME → webhook'gacha Payment BO'LMASLIGI kerak.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTestOrder, done, log } from './_helpers.mjs';

// DATABASE_URL'ni .env fayllardan o'qib process.env'ga qo'yamiz (PrismaClient'dan oldin)
const here = dirname(fileURLToPath(import.meta.url));
for (const rel of ['../../.env.local', '../../.env', '../../../.env']) {
  try {
    const txt = readFileSync(join(here, rel), 'utf8');
    const m = txt.match(/^DATABASE_URL=(.*)$/m);
    if (m && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* fayl yo'q — keyingisiga o'tamiz */
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL topilmadi (.env)');
  process.exit(1);
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

try {
  // COD buyurtma
  const cod = await createTestOrder('CASH_ON_DELIVERY');
  const codPayments = await prisma.payment.findMany({ where: { orderId: cod.id } });
  log(
    codPayments.length === 1 &&
      codPayments[0].provider === 'CASH_ON_DELIVERY' &&
      codPayments[0].status === 'PENDING',
    'COD buyurtma → Payment{CASH_ON_DELIVERY, PENDING}',
    codPayments.map((p) => ({ provider: p.provider, status: p.status })),
  );

  // PAYME (online) buyurtma — webhook'gacha Payment bo'lmasligi kerak
  const online = await createTestOrder('PAYME');
  const onlinePayments = await prisma.payment.findMany({ where: { orderId: online.id } });
  log(
    onlinePayments.length === 0,
    'PAYME buyurtma → webhook‘gacha Payment yo‘q',
    { count: onlinePayments.length },
  );
} finally {
  await prisma.$disconnect();
}

done();
