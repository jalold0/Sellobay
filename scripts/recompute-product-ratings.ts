// Mahsulot reytinglarini HAQIQIY sharhlardan qayta hisoblaydi.
//
// NEGA KERAK:
// `Product.rating` va `Product.reviewCount` seed'ga qo'lda yozilgan edi
// (masalan `rating: 4.8, reviewCount: 124`), `Review` jadvalida esa
// birorta ham yozuv yo'q. Natijada mahsulot sahifasi bir vaqtda
// «4.8 (124)» va «Bu mahsulotga hali sharh qoldirilmagan» deb turadi.
//
// `reviews-server.ts` bu raqamlarni sharh yozilganda/o'chirilganda
// o'zi qayta hisoblaydi — lekin FAQAT o'sha mahsulot uchun. Mavjud
// to'qima raqamlarni bir martalik tozalash shu skript bilan bo'ladi.
//
// ISHGA TUSHIRISH (repo root'dan):
//   npx tsx scripts/recompute-product-ratings.ts            # QURUQ yurish
//   npx tsx scripts/recompute-product-ratings.ts --apply    # bazaga YOZADI
//
// DIQQAT: `DATABASE_URL` PRODUCTION bazaga qaragan. `--apply` siz
// hech narsa yozilmaydi — avval ro'yxatni ko'ring.

// Boshqa skriptlar kabi paketga TO'G'RIDAN-TO'G'RI murojaat:
// `@ecom/database` repo ildizidan hal bo'lmaydi.
import { writeFileSync } from 'node:fs';

import { Prisma, prisma } from '../packages/database/src/index.ts';

const APPLY = process.argv.includes('--apply');

/** Yozishdan oldingi holat shu yerga tushadi. */
const BACKUP_FILE = `ratings-backup-${new Date().toISOString().slice(0, 10)}.json`;

interface Change {
  slug: string;
  fromRating: string;
  toRating: string;
  fromCount: number;
  toCount: number;
}

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, rating: true, reviewCount: true },
    orderBy: { createdAt: 'asc' },
  });

  // Sharhlarni BITTA so'rovda yig'amiz — mahsulot boshiga alohida
  // so'rov yuborsak, katalog kattalashganda skript sudralib qolardi.
  const grouped = await prisma.review.groupBy({
    by: ['productId'],
    where: { isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byProduct = new Map(grouped.map((g) => [g.productId, g]));

  // Yozishdan OLDIN joriy holat zaxiraga tushadi. Bayroq emas, doimiy
  // xulq: qaytarish kerak bo'lsa, «esdan chiqib qolgan» holat
  // bo'lmasligi uchun.
  if (APPLY) {
    const snapshot = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      rating: p.rating.toFixed(2),
      reviewCount: p.reviewCount,
    }));
    writeFileSync(BACKUP_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
    console.log(`Zaxira: ${BACKUP_FILE} (${snapshot.length} mahsulot)
`);
  }

  const changes: Change[] = [];

  for (const product of products) {
    const agg = byProduct.get(product.id);
    const nextCount = agg?._count._all ?? 0;
    const nextRating = (agg?._avg.rating ?? 0).toFixed(2);

    // `Decimal` ni satr sifatida solishtiramiz: `4.8` va `4.80` bir xil
    // qiymat, lekin obyekt sifatida teng emas.
    const sameRating = product.rating.toFixed(2) === nextRating;
    const sameCount = product.reviewCount === nextCount;
    if (sameRating && sameCount) continue;

    changes.push({
      slug: product.slug,
      fromRating: product.rating.toFixed(2),
      toRating: nextRating,
      fromCount: product.reviewCount,
      toCount: nextCount,
    });

    if (APPLY) {
      await prisma.product.update({
        where: { id: product.id },
        data: { rating: new Prisma.Decimal(nextRating), reviewCount: nextCount },
      });
    }
  }

  console.log(`Mahsulot: ${products.length}, sharhi bor: ${grouped.length}`);
  console.log(`O'zgaradigan: ${changes.length}\n`);

  for (const c of changes.slice(0, 40)) {
    console.log(
      `  ${c.slug.padEnd(34)} ${c.fromRating} (${c.fromCount}) -> ${c.toRating} (${c.toCount})`,
    );
  }
  if (changes.length > 40) console.log(`  ... va yana ${changes.length - 40} ta`);

  console.log(
    APPLY ? '\nBAZAGA YOZILDI.' : '\nQURUQ YURISH — hech narsa yozilmadi. Yozish uchun: --apply',
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
