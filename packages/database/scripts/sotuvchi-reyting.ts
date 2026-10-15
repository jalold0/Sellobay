// Do'kon (sotuvchi) reytingini MAVJUD sharhlardan bir marta hisoblaydi.
//
// `Seller.rating` ilgari hech qachon yozilmasdi (hammasi 0). Endi har
// sharh yozilganda/o'chirilganda u avtomatik yangilanadi
// (apps/web/src/lib/reviews-server.ts → recomputeSellerRating), lekin
// oldin yozilgan sharhlar uchun shu skript bir marta ishga tushiriladi.
// Formula o'sha yerdagi bilan bir xil: do'konning barcha tasdiqlangan
// sharhlari o'rtachasi.
//
//   pnpm --filter @ecom/database sellers:rating --tekshir   (faqat ko'rsatadi)
//   pnpm --filter @ecom/database sellers:rating             (yozadi)
//
// Qayta ishga tushirish xavfsiz — natija bir xil chiqadi.

import { Prisma, PrismaClient } from '@prisma/client';

const dryRun = process.argv.includes('--tekshir');
const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.seller.findMany({
    select: { id: true, brandName: true, rating: true },
  });
  let changed = 0;
  for (const s of sellers) {
    const agg = await prisma.review.aggregate({
      where: { isApproved: true, product: { sellerId: s.id } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const rating = new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2));
    if (rating.equals(s.rating)) continue;
    changed++;
    console.info(
      `${s.brandName}: ${s.rating.toString()} → ${rating.toString()} (${agg._count._all} sharh)`,
    );
    if (!dryRun) await prisma.seller.update({ where: { id: s.id }, data: { rating } });
  }
  console.info(
    `\n${sellers.length} ta do'kondan ${changed} tasi ${dryRun ? 'o‘zgaradi (TEKSHIRUV, yozilmadi)' : 'yangilandi'}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
