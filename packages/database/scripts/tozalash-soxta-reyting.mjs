// Bazadagi SOXTA reyting, sharh soni va sotuv sonini tozalaydi.
//
// MUAMMO: seed ma'lumotida mahsulotlarga oldindan reyting va sharh soni
// yozilgan edi — masalan Dior Sauvage uchun 4.8 yulduz va 198 sharh. Bazada
// esa `Review` jadvalida 0 ta yozuv bor. Ya'ni mijoz saytda "198 sharh"
// ko'rib bosib kirsa, hech narsa topmasdi. `soldCount` ham shunday: Puma RS-X
// uchun 156 deb yozilgan, haqiqiy buyurtmalarda esa 3 ta sotilgan.
//
// NIMA QILADI:
//   • rating va reviewCount — mahsulotning HAQIQIY sharhlaridan qayta hisoblanadi
//     (sharh yo'q bo'lsa 0 ga tushadi)
//   • soldCount — to'langan buyurtmalardagi haqiqiy miqdordan qayta hisoblanadi
//
// XAVFSIZLIK: yozishdan OLDIN barcha eski qiymatlar JSON faylga saqlanadi.
// Kerak bo'lsa o'sha fayl orqali qaytarish mumkin.
//
// Ishga tushirish:
//   node packages/database/scripts/tozalash-soxta-reyting.mjs --tekshir   (faqat ko'rsatadi)
//   node packages/database/scripts/tozalash-soxta-reyting.mjs             (yozadi)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const DRY_RUN = process.argv.includes('--tekshir');
const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, rating: true, reviewCount: true, soldCount: true },
  });

  // Haqiqiy sharhlar (faqat tasdiqlangani hisobga olinadi — saytda ham shular ko'rinadi)
  const reviewGroups = await prisma.review.groupBy({
    by: ['productId'],
    where: { isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  const reviewByProduct = new Map(reviewGroups.map((row) => [row.productId, row]));

  // Haqiqiy sotuv — to'langan buyurtmalardagi miqdor yig'indisi
  const soldGroups = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { paidAt: { not: null } } },
    _sum: { quantity: true },
  });
  const soldByProduct = new Map(soldGroups.map((row) => [row.productId, row._sum.quantity ?? 0]));

  const changes = [];
  for (const product of products) {
    const reviews = reviewByProduct.get(product.id);
    const realCount = reviews?._count ?? 0;
    const realRating = realCount > 0 ? Number((reviews._avg.rating ?? 0).toFixed(2)) : 0;
    const realSold = soldByProduct.get(product.id) ?? 0;

    const oldRating = Number(product.rating);
    if (oldRating === realRating && product.reviewCount === realCount && product.soldCount === realSold) {
      continue;
    }
    changes.push({
      id: product.id,
      sku: product.sku,
      nom: product.name?.uz ?? '',
      eski: { rating: oldRating, reviewCount: product.reviewCount, soldCount: product.soldCount },
      yangi: { rating: realRating, reviewCount: realCount, soldCount: realSold },
    });
  }

  console.log(`Mahsulotlar: ${products.length}, o'zgaradiganlari: ${changes.length}\n`);
  for (const change of changes) {
    console.log(
      `  ${change.sku.padEnd(24)} ${String(change.nom).slice(0, 26).padEnd(28)}` +
        ` reyting ${change.eski.rating} → ${change.yangi.rating}` +
        ` | sharh ${change.eski.reviewCount} → ${change.yangi.reviewCount}` +
        ` | sotilgan ${change.eski.soldCount} → ${change.yangi.soldCount}`,
    );
  }

  if (changes.length === 0) {
    console.log('\nHech narsa o`zgarmaydi.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n--tekshir rejimi: bazaga hech narsa yozilmadi.');
    return;
  }

  // Zaxira nusxa — yozishdan OLDIN
  const backupPath = join(here, 'zaxira-soxta-reyting.json');
  writeFileSync(backupPath, JSON.stringify(changes, null, 2) + '\n', 'utf8');
  console.log(`\nEski qiymatlar saqlandi: ${backupPath}`);

  await prisma.$transaction(
    changes.map((change) =>
      prisma.product.update({
        where: { id: change.id },
        data: {
          rating: change.yangi.rating,
          reviewCount: change.yangi.reviewCount,
          soldCount: change.yangi.soldCount,
        },
      }),
    ),
  );
  console.log(`${changes.length} ta mahsulot yangilandi.`);
}

main()
  .catch((error) => {
    console.error('XATO:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
